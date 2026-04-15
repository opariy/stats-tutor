/**
 * Teaching Planner
 * Generates structured teaching plans before tutor responses
 * Ensures pedagogical flow: EXPLAIN → EXAMPLE → PRACTICE → VERIFY
 */

import Anthropic from "@anthropic-ai/sdk";
import { MODEL_IDS } from "./types";

export type TeachingPhase =
  | "explain"      // Teaching the concept
  | "example"      // Showing worked example
  | "practice"     // Giving problem to solve
  | "verify"       // Checking their answer
  | "advance";     // Moving to next topic

export interface TeachingState {
  topicId: string;
  topicName: string;
  phase: TeachingPhase;
  conceptsExplained: string[];
  examplesShown: string[];
  practiceGiven: string | null;
  studentAnswer: string | null;
  verified: boolean;
  canAdvance: boolean;
}

export interface TeachingPlan {
  currentPhase: TeachingPhase;
  nextPhase: TeachingPhase;
  action: string;
  practiceQuestion: string | null;
  requiresData: boolean;
  canAdvanceToNextTopic: boolean;
  reasoning: string;
}

const PLANNING_PROMPT = `You are a teaching planner. Analyze the conversation and output a structured teaching plan.

TEACHING FLOW (must follow in order):
1. EXPLAIN - Teach what the concept is, why it matters, how it works
2. EXAMPLE - Show a complete worked example with real data
3. PRACTICE - Give student a problem to solve (MUST include real data/numbers)
4. VERIFY - Check if their answer is correct
5. ADVANCE - Only after verified correct, move to next topic

RULES:
- Cannot skip phases
- Cannot ADVANCE until PRACTICE is verified correct
- PRACTICE questions MUST include specific data/numbers
- Only ONE question at a time
- Never ask about concepts not yet taught

Analyze the conversation and determine:
1. What phase are we in?
2. What should happen next?
3. If practice, what specific problem (with data)?

Output ONLY valid JSON:
{
  "currentPhase": "explain|example|practice|verify|advance",
  "nextPhase": "explain|example|practice|verify|advance",
  "action": "description of what tutor should do",
  "practiceQuestion": "specific question with data, or null",
  "requiresData": true/false,
  "canAdvanceToNextTopic": true/false,
  "reasoning": "why this is the right next step"
}`;

export async function generateTeachingPlan(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  topicName: string,
  previousState?: TeachingState
): Promise<TeachingPlan> {
  const anthropic = new Anthropic();

  // Build context about what's happened
  let stateContext = "";
  if (previousState) {
    stateContext = `
CURRENT STATE:
- Topic: ${previousState.topicName}
- Phase: ${previousState.phase}
- Concepts explained: ${previousState.conceptsExplained.join(", ") || "none yet"}
- Examples shown: ${previousState.examplesShown.length}
- Practice given: ${previousState.practiceGiven ? "yes" : "no"}
- Student answered: ${previousState.studentAnswer ? "yes" : "no"}
- Verified correct: ${previousState.verified ? "yes" : "no"}
`;
  }

  // Format recent messages
  const recentMessages = messages.slice(-6).map(m =>
    `${m.role.toUpperCase()}: ${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`
  ).join("\n\n");

  const response = await anthropic.messages.create({
    model: MODEL_IDS.haiku, // Use faster/cheaper model for planning
    max_tokens: 500,
    // Cache the planning prompt (static instructions)
    system: [
      {
        type: "text",
        text: PLANNING_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `TOPIC: "${topicName}"
${stateContext}

RECENT CONVERSATION:
${recentMessages}

Output the teaching plan as JSON:`
      }
    ],
  });

  const textBlock = response.content[0];
  if (textBlock.type !== "text") {
    throw new Error("Unexpected response type");
  }

  let jsonText = textBlock.text.trim();

  // Extract JSON if wrapped in code blocks
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  try {
    const plan = JSON.parse(jsonText) as TeachingPlan;

    // Validate the plan
    const validatedPlan = validatePlan(plan, previousState);

    return validatedPlan;
  } catch (error) {
    console.error("Failed to parse teaching plan:", error);
    // Return safe default
    return {
      currentPhase: previousState?.phase || "explain",
      nextPhase: previousState?.phase === "explain" ? "example" : "practice",
      action: "Continue teaching the current topic",
      practiceQuestion: null,
      requiresData: false,
      canAdvanceToNextTopic: false,
      reasoning: "Fallback plan due to parsing error"
    };
  }
}

function validatePlan(plan: TeachingPlan, state?: TeachingState): TeachingPlan {
  // Rule 1: Cannot advance if not verified
  if (plan.canAdvanceToNextTopic && state && !state.verified) {
    plan.canAdvanceToNextTopic = false;
    plan.reasoning += " [BLOCKED: Cannot advance without verified practice]";
  }

  // Rule 2: Practice questions must have data
  if (plan.nextPhase === "practice" && plan.practiceQuestion) {
    const hasNumbers = /\d+/.test(plan.practiceQuestion);
    if (!hasNumbers) {
      plan.requiresData = true;
      plan.reasoning += " [WARNING: Practice question needs specific data]";
    }
  }

  // Rule 3: Cannot skip from explain to verify
  if (state?.phase === "explain" && plan.nextPhase === "verify") {
    plan.nextPhase = "example";
    plan.reasoning += " [CORRECTED: Must show example before verify]";
  }

  return plan;
}

export function updateTeachingState(
  currentState: TeachingState,
  plan: TeachingPlan,
  studentMessage?: string
): TeachingState {
  const newState = { ...currentState };

  // Update phase
  newState.phase = plan.nextPhase;

  // Track practice
  if (plan.practiceQuestion) {
    newState.practiceGiven = plan.practiceQuestion;
    newState.studentAnswer = null;
    newState.verified = false;
  }

  // Track student answer
  if (studentMessage && currentState.phase === "practice") {
    newState.studentAnswer = studentMessage;
  }

  // Update advancement status
  newState.canAdvance = plan.canAdvanceToNextTopic;

  return newState;
}

export function createInitialState(topicId: string, topicName: string): TeachingState {
  return {
    topicId,
    topicName,
    phase: "explain",
    conceptsExplained: [],
    examplesShown: [],
    practiceGiven: null,
    studentAnswer: null,
    verified: false,
    canAdvance: false,
  };
}
