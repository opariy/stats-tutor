import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Question } from "@/lib/assessment-types";

const anthropic = new Anthropic();

// Retry with exponential backoff for overloaded errors
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isOverloaded =
        error instanceof Anthropic.APIError &&
        (error.status === 529 || error.message?.includes("Overloaded"));

      if (!isOverloaded || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Anthropic overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Generate curriculum-based multiple choice questions
async function generateQuizQuestions(
  examName: string,
  curriculum: string | null,
  questionCount: number
): Promise<Question[]> {
  const curriculumSection = curriculum
    ? `Here is their curriculum/syllabus/topics:
---
${curriculum}
---

Generate ${questionCount} multiple-choice questions that test the topics from this curriculum.`
    : `Generate ${questionCount} multiple-choice questions that would typically appear on this exam.`;

  const response = await withRetry(() => anthropic.messages.create({
    model: "claude-sonnet-4-0",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are creating a practice quiz for a student preparing for: "${examName}"

${curriculumSection}

Questions should:

1. USE BLOOM'S TAXONOMY MIX:
   - 30% Remember/Understand: "What is...", "Which describes..."
   - 50% Apply/Analyze: "Given X, what is Y?", "What happens when..."
   - 20% Evaluate: "Which approach is best for...", "What's wrong with..."

2. MATCH EXAM STYLE:
   - Questions should feel like real exam questions
   - Be specific, not vague
   - Test understanding, not trivia

3. CREATE GOOD DISTRACTORS:
   - Wrong answers should be common misconceptions
   - All options similar in length and style
   - No "all of the above" or "none of the above"

4. ASSIGN CLEAR TOPICS:
   - Each question's "topic" field should be a clear topic name
   - This helps identify which areas need more study

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "id": "q1",
      "question": "If a dataset has a mean of 50 and standard deviation of 10, what percentage of data falls within one standard deviation of the mean in a normal distribution?",
      "topic": "Normal Distribution",
      "difficulty": "medium",
      "options": ["50%", "68%", "95%", "99.7%"],
      "correctIndex": 1,
      "explanation": "In a normal distribution, approximately 68% of data falls within one standard deviation of the mean (the 68-95-99.7 rule)."
    }
  ]
}

RULES:
- correctIndex is 0-based (0, 1, 2, or 3)
- Each question has EXACTLY 4 options
- Explanation should be 1-2 sentences explaining why the correct answer is right`,
      },
    ],
  }));

  const textBlock = response.content[0];
  if (textBlock.type !== "text") {
    throw new Error("Unexpected response type");
  }

  let jsonText = textBlock.text.trim();
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  const parsed = JSON.parse(jsonText);

  const questions = parsed.questions as Question[];
  for (const q of questions) {
    if (!q.options || q.options.length !== 4) {
      throw new Error(`Question ${q.id} doesn't have exactly 4 options`);
    }
    if (q.correctIndex < 0 || q.correctIndex > 3) {
      throw new Error(`Question ${q.id} has invalid correctIndex`);
    }
  }

  return questions;
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    if (action === "generate") {
      const { examName, curriculum, questionCount } = params;

      if (!examName || !questionCount) {
        return NextResponse.json(
          { error: "examName and questionCount are required" },
          { status: 400 }
        );
      }

      const questions = await generateQuizQuestions(examName, curriculum || null, questionCount);

      return NextResponse.json({
        type: "quiz_ready",
        quiz: {
          subject: examName,
          questions,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Assessment API error:", error);

    // Check if it's an Anthropic overload error after retries exhausted
    if (error instanceof Anthropic.APIError && error.status === 529) {
      return NextResponse.json(
        { error: "AI service is temporarily busy. Please try again in a moment." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assessment failed" },
      { status: 500 }
    );
  }
}
