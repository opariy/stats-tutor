/**
 * Evaluator Agent
 * Grades free-text quiz answers
 */

import { callAgent } from "./base";
import { AGENTS } from "./types";

export interface EvaluationResult {
  isCorrect: boolean;
  score: number; // 0-100
  feedback: string;
}

const SYSTEM_PROMPT = `You are an answer evaluator. Your job is to fairly grade student answers.

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "isCorrect": true | false,
  "score": 0-100,
  "feedback": "Brief explanation of why correct/incorrect and what was missing if applicable"
}

GRADING RULES:
- Focus on conceptual understanding, not exact wording
- Accept equivalent formulations and correct synonyms
- Partial credit (score 50-80) for partially correct answers
- Be lenient with minor errors if core understanding is shown
- Be strict about fundamental misconceptions

SCORING GUIDE:
- 90-100: Fully correct, demonstrates clear understanding
- 70-89: Mostly correct, minor issues or missing details
- 50-69: Partially correct, shows some understanding
- 20-49: Incorrect but shows effort or partial knowledge
- 0-19: Completely wrong or no relevant content

isCorrect should be true if score >= 70`;

export async function evaluateAnswer(
  question: string,
  expectedAnswer: string,
  studentAnswer: string,
  objective?: string
): Promise<EvaluationResult> {
  const userMessage = `Evaluate this answer:

Question: ${question}
${objective ? `Learning Objective: ${objective}` : ""}
Expected Answer: ${expectedAnswer}

Student's Answer: ${studentAnswer}

Grade the answer and return JSON.`;

  const response = await callAgent({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    agentConfig: AGENTS.evaluator,
    metadata: { questionLength: question.length.toString() },
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
    console.error("[Evaluator] Failed to parse JSON:", error);
    console.error("Raw response:", response.content);
    // Default to incorrect on parse failure
    return {
      isCorrect: false,
      score: 0,
      feedback: "Unable to evaluate answer",
    };
  }
}

/**
 * Evaluate multiple answers in batch
 */
export async function evaluateAnswersBatch(
  evaluations: Array<{
    question: string;
    expectedAnswer: string;
    studentAnswer: string;
    objective?: string;
  }>
): Promise<EvaluationResult[]> {
  // Process sequentially to avoid rate limits
  const results: EvaluationResult[] = [];
  for (const item of evaluations) {
    const result = await evaluateAnswer(
      item.question,
      item.expectedAnswer,
      item.studentAnswer,
      item.objective
    );
    results.push(result);
  }
  return results;
}
