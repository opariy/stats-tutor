/**
 * Student Simulator Agent
 * Simulates different student personas for testing tutor quality
 */

import { callAgent } from "./base";
import { AGENTS, AgentConfig } from "./types";

export type StudentPersona =
  | "curious_beginner"      // Asks good questions, eager to learn
  | "struggling_student"    // Makes mistakes, needs extra help
  | "advanced_student"      // Catches on quickly, wants depth
  | "distracted_student"    // Goes off-topic, needs refocusing
  | "anxious_student";      // Worried about getting things wrong

export interface SimulatorConfig {
  persona: StudentPersona;
  topic: string;
  domain: string;  // e.g., "statistics", "sociology", "biology"
  priorKnowledge?: "none" | "some" | "solid";  // How much they already know
}

const PERSONA_TRAITS: Record<StudentPersona, string> = {
  curious_beginner: `You're genuinely curious and eager to learn. You ask clarifying questions when something isn't clear. You try to connect new concepts to things you already know. You admit when you don't understand something.`,

  struggling_student: `You find this topic difficult. You often misunderstand explanations on the first try. You make common mistakes (like confusing similar concepts). You sometimes give wrong answers confidently. You need concepts broken down into smaller steps.`,

  advanced_student: `You pick things up quickly. You ask "why" questions and want to understand the deeper reasoning. You might ask about edge cases or exceptions. You get slightly bored with overly basic explanations.`,

  distracted_student: `You sometimes go off on tangents or ask unrelated questions. You might share personal stories loosely connected to the topic. You occasionally need to be brought back to the main point. You're not rude, just easily sidetracked.`,

  anxious_student: `You're worried about getting things wrong. You often ask "is this right?" before committing to an answer. You might second-guess yourself even when correct. You appreciate encouragement but don't want empty praise.`,
};

const KNOWLEDGE_LEVELS: Record<string, string> = {
  none: "You have no prior knowledge of this topic. Basic terminology is new to you.",
  some: "You have a vague understanding from school but forgot most details.",
  solid: "You understand the basics but want to deepen your knowledge.",
};

function buildSimulatorPrompt(config: SimulatorConfig): string {
  const { persona, topic, domain, priorKnowledge = "some" } = config;

  return `You are a student learning about "${topic}" in the domain of ${domain}.

PERSONALITY:
${PERSONA_TRAITS[persona]}

KNOWLEDGE LEVEL:
${KNOWLEDGE_LEVELS[priorKnowledge]}

YOUR ROLE:
- You are talking to a tutor who is teaching you
- Respond naturally as this student would
- Keep responses short (1-3 sentences typically)
- You can ask questions, attempt answers, express confusion, etc.
- Don't be overly polite or formal - talk like a real student

IMPORTANT:
- Stay in character as the student
- Never break character or mention you're an AI
- Don't summarize or explain what you're doing
- Just respond naturally as this student would`;
}

/**
 * Generate a student's first message to start a conversation
 */
export async function generateFirstMessage(
  config: SimulatorConfig
): Promise<string> {
  const systemPrompt = buildSimulatorPrompt(config);

  const userMessage = `The tutor is ready to help you learn about "${config.topic}".
Start the conversation by asking a question or saying what you want to learn.
Remember to stay in character as a ${config.persona.replace("_", " ")}.`;

  const response = await callAgent({
    systemPrompt,
    userMessage,
    agentConfig: AGENTS.studentSimulator,
    metadata: {
      persona: config.persona,
      topic: config.topic,
      domain: config.domain,
    },
  });

  return response.content;
}

/**
 * Generate a student's response to the tutor
 */
export async function generateStudentResponse(
  config: SimulatorConfig,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const systemPrompt = buildSimulatorPrompt(config);

  // Build conversation context
  // In the simulation: "user" = student, "assistant" = tutor
  // But for the LLM call, we flip it: the simulator IS the "assistant"
  const formattedHistory = conversationHistory.map((msg) => ({
    role: msg.role === "user" ? "assistant" : "user",  // Flip: student was "user", tutor was "assistant"
    content: msg.role === "user"
      ? `[You said]: ${msg.content}`
      : `[Tutor said]: ${msg.content}`,
  }));

  // Last message should be from tutor, so student needs to respond
  const lastTutorMessage = conversationHistory[conversationHistory.length - 1];

  const userMessage = `The tutor just said:
"${lastTutorMessage.content}"

Respond naturally as this student would. Keep it short and realistic.`;

  const response = await callAgent({
    systemPrompt,
    userMessage,
    agentConfig: AGENTS.studentSimulator,
    metadata: {
      persona: config.persona,
      topic: config.topic,
      turn: conversationHistory.length.toString(),
    },
  });

  return response.content;
}

/**
 * Generate multiple test scenarios for a topic
 */
export function generateTestScenarios(
  topic: string,
  domain: string
): SimulatorConfig[] {
  const personas: StudentPersona[] = [
    "curious_beginner",
    "struggling_student",
    "advanced_student",
  ];

  const knowledgeLevels: Array<"none" | "some" | "solid"> = ["none", "some", "solid"];

  // Create a mix of scenarios
  return [
    { persona: "curious_beginner", topic, domain, priorKnowledge: "none" },
    { persona: "struggling_student", topic, domain, priorKnowledge: "some" },
    { persona: "advanced_student", topic, domain, priorKnowledge: "solid" },
    { persona: "anxious_student", topic, domain, priorKnowledge: "some" },
  ];
}
