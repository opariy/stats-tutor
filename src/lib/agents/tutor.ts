/**
 * Tutor Agent
 * Main teaching/chat agent with pedagogical expertise
 * Uses structured planning to ensure proper pedagogical flow
 */

import { streamAgentConversation } from "./base";
import { AGENTS } from "./types";
import {
  generateTeachingPlan,
  TeachingPlan,
  TeachingState,
  createInitialState,
  updateTeachingState,
} from "./teaching-planner";

export interface TutorContext {
  courseName: string;
  courseDescription?: string;
  topicsList: string;
  teachingStyle: "direct" | "socratic" | "guided";
  objectives?: Array<{
    id: string;
    objective: string;
    checkMethod: string;
    status: "not_started" | "attempted" | "passed" | "failed";
  }>;
  currentTopicName?: string;
  teachingPlan?: TeachingPlan;
  teachingState?: TeachingState;
}

function buildSystemPrompt(context: TutorContext): string {
  const { courseName, courseDescription, topicsList, objectives, currentTopicName, teachingPlan } = context;

  // Build objectives section if provided
  let objectivesSection = "";
  if (objectives && objectives.length > 0 && currentTopicName) {
    const objectivesList = objectives
      .map((obj) => {
        const status = obj.status === "passed" ? "✓" : "○";
        return `${status} ${obj.objective} [${obj.id}]`;
      })
      .join("\n");

    const allPassed = objectives.filter(o => o.checkMethod === "conversational").every(o => o.status === "passed");

    objectivesSection = `
OBJECTIVES for "${currentTopicName}":
${objectivesList}

Mark passed ONLY when student solves a problem correctly (not when they say "I understand").
Use: <!-- OBJECTIVE_UPDATE: {"objective_id": "ID", "status": "passed"} -->

If student shows a prerequisite gap (e.g., can't do basic math), flag it:
<!-- PREREQUISITE_GAP: {"concept": "name", "severity": "blocking|slowing"} -->
Then offer: "Want me to add a quick [concept] refresher to your course?"
${allPassed ? '\nAll objectives done - suggest: "Ready for a quick quiz?"' : ""}`;
  }

  // Practice question from plan
  const practiceInstruction = teachingPlan?.practiceQuestion
    ? `\nGIVE THIS PRACTICE QUESTION: "${teachingPlan.practiceQuestion}"`
    : "";

  return `You are a tutor for "${courseName}".
${courseDescription ? `Context: ${courseDescription}` : ""}
Topics: ${topicsList}
${practiceInstruction}

PERSONALITY: You're a smart friend who happens to know this subject well. Explain things the way you'd explain to a friend over coffee - casual, clear, no fluff.

KEEP IT SHORT:
- 2-4 sentences to explain a concept
- One example max (make it concrete with real numbers/scenarios)
- Don't lecture - have a conversation

DON'T DO THESE (they're annoying):
- "Great question!" / "Let's dive in!" / "Here are the key points:"
- Bullet lists of characteristics or definitions
- "What questions do you have?" at the end
- Multiple examples when one is enough
- Textbook-style definitions

PRACTICE QUESTIONS:
- Only when introducing something new OR student asks
- Must include ALL info needed to answer (no mind-reading)
- Use real numbers and scenarios

MATH: Wrap in dollar signs or it won't render.
- Inline: $f(x) = 3x - 5$
- Display: $$\\bar{x} = \\frac{\\sum x}{n}$$
${objectivesSection}`;
}

/**
 * Stream tutor response with structured planning
 * This is the preferred method - it uses a planning step to ensure proper pedagogy
 *
 * OPTIMIZATION: Only generate a teaching plan on:
 * - First message (conversation start)
 * - Every 4th user message (periodic check)
 * - When student might be ready to advance (after practice)
 * This reduces API calls by ~75%
 */
export async function streamTutorResponseWithPlan(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  context: TutorContext,
  existingState?: TeachingState
): Promise<{
  stream: AsyncIterable<string>;
  getUsage: () => Promise<{ inputTokens: number; outputTokens: number; costUsd: number }>;
  plan: TeachingPlan;
  newState: TeachingState;
}> {
  const topicName = context.currentTopicName || "General Statistics";

  // Initialize state if not provided
  const currentState = existingState || createInitialState(
    context.objectives?.[0]?.id || "general",
    topicName
  );

  // OPTIMIZATION: Only call the planner when necessary
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const isFirstMessage = userMessageCount <= 1;
  const isPeriodicCheck = userMessageCount % 4 === 0;
  const isPracticePhase = currentState.phase === "practice" || currentState.phase === "verify";

  const shouldGeneratePlan = isFirstMessage || isPeriodicCheck || isPracticePhase;

  let plan: TeachingPlan;

  if (shouldGeneratePlan) {
    // Step 1: Generate teaching plan (only when needed)
    plan = await generateTeachingPlan(messages, topicName, currentState);
    console.log("[Teaching Plan] Generated new plan:", plan.currentPhase, "→", plan.nextPhase);
  } else {
    // Use a lightweight default plan based on current state
    plan = {
      currentPhase: currentState.phase,
      nextPhase: currentState.phase === "explain" ? "example" :
                 currentState.phase === "example" ? "practice" : currentState.phase,
      action: "Continue teaching naturally",
      practiceQuestion: null,
      requiresData: false,
      canAdvanceToNextTopic: false,
      reasoning: "Skipped planner call (optimization)"
    };
    console.log("[Teaching Plan] Using cached plan (optimization):", plan.currentPhase);
  }

  // Step 2: Update state based on plan
  const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content;
  const newState = updateTeachingState(currentState, plan, lastUserMessage);

  // Step 3: Add plan to context
  const enrichedContext: TutorContext = {
    ...context,
    teachingPlan: plan,
    teachingState: newState,
  };

  // Step 4: Generate response following the plan
  const systemPrompt = buildSystemPrompt(enrichedContext);

  const result = await streamAgentConversation({
    systemPrompt,
    messages,
    agentConfig: AGENTS.tutor,
    metadata: {
      courseName: context.courseName,
      topicName: topicName,
      messageCount: messages.length.toString(),
      teachingPhase: plan.currentPhase,
    },
  });

  return {
    ...result,
    plan,
    newState,
  };
}

/**
 * Original stream tutor response (without planning)
 * Use streamTutorResponseWithPlan instead for better pedagogy
 */
export async function streamTutorResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  context: TutorContext
): Promise<{
  stream: AsyncIterable<string>;
  getUsage: () => Promise<{ inputTokens: number; outputTokens: number; costUsd: number }>;
}> {
  const systemPrompt = buildSystemPrompt(context);

  return streamAgentConversation({
    systemPrompt,
    messages,
    agentConfig: AGENTS.tutor,
    metadata: {
      courseName: context.courseName,
      topicName: context.currentTopicName || "general",
      messageCount: messages.length.toString(),
    },
  });
}

// Re-export planner utilities for external use
export { createInitialState } from "./teaching-planner";
export type { TeachingState, TeachingPlan } from "./teaching-planner";
