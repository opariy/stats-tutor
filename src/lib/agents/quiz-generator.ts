/**
 * Quiz Generator Agent
 * Creates quiz questions (MCQ and free-text)
 */

import { callAgent } from "./base";
import { AGENTS } from "./types";

export interface QuizQuestion {
  objectiveId: string;
  question: string;
  type: "mcq" | "free_text";
  options?: string[]; // For MCQ
  correctAnswer: string; // Index for MCQ ("0", "1", etc.) or expected answer for free_text
  explanation: string;
}

export interface QuizOutput {
  questions: QuizQuestion[];
}

const SYSTEM_PROMPT = `You are a quiz question specialist. Your job is to create clear, fair quiz questions that test understanding.

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "questions": [
    {
      "objectiveId": "the-objective-id",
      "question": "The question text",
      "type": "mcq" | "free_text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "0",
      "explanation": "Why this is the correct answer"
    }
  ]
}

FOR MCQ QUESTIONS:
- Always provide exactly 4 options
- correctAnswer is the index of the correct option ("0", "1", "2", or "3")
- Make wrong options plausible but clearly incorrect
- Avoid "all of the above" or "none of the above"

FOR FREE_TEXT QUESTIONS:
- Don't include options
- correctAnswer should describe what a good answer includes
- Questions should have clear, concise expected answers

QUALITY RULES:
- Questions should directly test the objective
- Avoid trick questions
- Be specific and unambiguous
- Use appropriate notation for the subject
- Keep questions focused on one concept`;

export async function generateQuiz(
  objectives: Array<{
    id: string;
    objective: string;
    checkMethod: "quiz_mcq" | "quiz_free_text";
  }>,
  topicName: string,
  courseName?: string
): Promise<QuizOutput> {
  const objectivesList = objectives
    .map((o) => `- ID: ${o.id} | Type: ${o.checkMethod} | Objective: ${o.objective}`)
    .join("\n");

  const userMessage = `Create quiz questions for these learning objectives:

Topic: ${topicName}
${courseName ? `Course: ${courseName}` : ""}

Objectives to create questions for:
${objectivesList}

Create ONE question per objective. Return as JSON.`;

  const response = await callAgent({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    agentConfig: AGENTS.quizGenerator,
    metadata: { topicName, objectiveCount: objectives.length.toString() },
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
    console.error("[Quiz Generator] Failed to parse JSON:", error);
    console.error("Raw response:", response.content);
    throw new Error("Failed to parse quiz JSON");
  }
}
