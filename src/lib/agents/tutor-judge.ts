/**
 * Tutor Judge Agent
 * Evaluates tutor response quality given conversation context
 */

import { callAgent } from "./base";
import { AGENTS } from "./types";

export interface JudgmentCriteria {
  clarity: number;           // 0-10: Was the explanation clear?
  accuracy: number;          // 0-10: Was the content correct?
  appropriateness: number;   // 0-10: Was this the right type of response?
  engagement: number;        // 0-10: Did it keep the student engaged?
  scaffolding: number;       // 0-10: Did it build on prior knowledge?
  conciseness: number;       // 0-10: Was it appropriately brief?
}

export interface TutorJudgment {
  overallScore: number;      // 0-100 weighted average
  criteria: JudgmentCriteria;
  expectedResponseType: string;  // What the judge thinks was needed
  actualResponseType: string;    // What the tutor actually did
  wasAppropriate: boolean;       // Did response type match what was needed?
  strengths: string[];           // What the tutor did well
  improvements: string[];        // What could be better
  reasoning: string;             // Brief explanation of the judgment
}

const SYSTEM_PROMPT = `You are an expert pedagogy evaluator. Your job is to judge the quality of a tutor's response in a learning conversation.

EVALUATION APPROACH:
1. First, understand the conversation context:
   - What is the student trying to learn?
   - What is the student's current state (confused, making progress, stuck)?
   - What type of response would be most helpful?

2. Then evaluate the tutor's actual response against what was needed.

RESPONSE TYPES (what might be appropriate):
- "explain": Teach a new concept
- "clarify": Re-explain something the student misunderstood
- "example": Provide a concrete example
- "question": Ask the student something to check understanding
- "confirm": Acknowledge correct understanding and move forward
- "correct": Gently fix a misconception
- "encourage": Support a struggling student
- "redirect": Bring an off-topic student back to the subject
- "challenge": Push an advanced student deeper

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "overallScore": 0-100,
  "criteria": {
    "clarity": 0-10,
    "accuracy": 0-10,
    "appropriateness": 0-10,
    "engagement": 0-10,
    "scaffolding": 0-10,
    "conciseness": 0-10
  },
  "expectedResponseType": "what type of response was needed",
  "actualResponseType": "what the tutor actually did",
  "wasAppropriate": true/false,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "reasoning": "2-3 sentence explanation"
}

SCORING GUIDE:
- 90-100: Excellent pedagogical response, exactly what was needed
- 70-89: Good response, minor improvements possible
- 50-69: Adequate but missed opportunities
- 30-49: Problematic - wrong approach or significant issues
- 0-29: Poor - actively harmful to learning

IMPORTANT PRINCIPLES:
- A short, clear response is better than a long, thorough one
- Asking a question can be better than explaining (Socratic method)
- The tutor should match the student's level
- Over-explaining to a student who already gets it is bad
- Under-explaining to a confused student is bad
- Being robotic or generic is bad ("Great question!" etc.)`;

/**
 * Judge a single tutor response given conversation context
 */
export async function judgeTutorResponse(
  conversation: Array<{ role: "user" | "assistant"; content: string }>,
  studentPersona: string,
  topic: string,
  domain: string
): Promise<TutorJudgment> {
  // The last message should be from the tutor (assistant)
  const tutorResponse = conversation[conversation.length - 1];
  if (tutorResponse.role !== "assistant") {
    throw new Error("Last message must be from the tutor (assistant)");
  }

  // Format conversation for the judge
  const formattedConversation = conversation.map((msg, i) => {
    const speaker = msg.role === "user" ? "STUDENT" : "TUTOR";
    return `[${i + 1}] ${speaker}: ${msg.content}`;
  }).join("\n\n");

  const userMessage = `Evaluate this tutoring conversation.

CONTEXT:
- Topic: ${topic}
- Domain: ${domain}
- Student type: ${studentPersona}

CONVERSATION:
${formattedConversation}

---

Evaluate the LAST tutor response (message ${conversation.length}).
Consider the full conversation context to determine if it was appropriate.

Return your judgment as JSON.`;

  const response = await callAgent({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    agentConfig: AGENTS.tutorJudge,
    metadata: {
      topic,
      domain,
      conversationLength: conversation.length.toString(),
    },
  });

  // Parse JSON from response
  try {
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("[TutorJudge] Failed to parse JSON:", error);
    console.error("Raw response:", response.content);
    // Return a default failed judgment
    return {
      overallScore: 0,
      criteria: {
        clarity: 0,
        accuracy: 0,
        appropriateness: 0,
        engagement: 0,
        scaffolding: 0,
        conciseness: 0,
      },
      expectedResponseType: "unknown",
      actualResponseType: "unknown",
      wasAppropriate: false,
      strengths: [],
      improvements: ["Unable to evaluate - parse error"],
      reasoning: "Failed to parse judgment response",
    };
  }
}

/**
 * Judge multiple responses in a conversation (e.g., every tutor turn)
 */
export async function judgeConversation(
  conversation: Array<{ role: "user" | "assistant"; content: string }>,
  studentPersona: string,
  topic: string,
  domain: string
): Promise<{
  turnJudgments: Array<{ turn: number; judgment: TutorJudgment }>;
  averageScore: number;
  summary: string;
}> {
  const judgments: Array<{ turn: number; judgment: TutorJudgment }> = [];

  // Judge each tutor response (every assistant message)
  for (let i = 0; i < conversation.length; i++) {
    if (conversation[i].role === "assistant") {
      // Get conversation up to and including this response
      const contextUpToHere = conversation.slice(0, i + 1);
      const judgment = await judgeTutorResponse(
        contextUpToHere,
        studentPersona,
        topic,
        domain
      );
      judgments.push({ turn: i + 1, judgment });
    }
  }

  const averageScore = judgments.length > 0
    ? judgments.reduce((sum, j) => sum + j.judgment.overallScore, 0) / judgments.length
    : 0;

  // Generate summary
  const appropriateCount = judgments.filter(j => j.judgment.wasAppropriate).length;
  const summary = `Evaluated ${judgments.length} tutor responses. Average score: ${averageScore.toFixed(1)}/100. ${appropriateCount}/${judgments.length} responses were contextually appropriate.`;

  return {
    turnJudgments: judgments,
    averageScore,
    summary,
  };
}
