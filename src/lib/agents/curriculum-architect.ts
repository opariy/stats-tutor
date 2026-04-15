/**
 * Curriculum Architect Agent
 * Creates course structure: chapters, topics, descriptions
 */

import { callAgent } from "./base";
import { AGENTS } from "./types";

export interface CurriculumOutput {
  chapters: Array<{
    number: number;
    title: string;
    topics: Array<{
      name: string;
      description: string;
      suggestions: string[];
    }>;
  }>;
}

const SYSTEM_PROMPT = `You are a curriculum architect. Your job is to create well-structured course outlines.

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "topics": [
        {
          "name": "Topic Name",
          "description": "2-3 sentence description of what this topic covers",
          "suggestions": ["Example question 1", "Example question 2", "Example question 3"]
        }
      ]
    }
  ]
}

RULES:
- Create 3-6 chapters depending on subject complexity
- Each chapter should have 2-5 topics
- Topics should flow logically within each chapter
- Suggestions should be questions a student might ask about this topic
- Adapt complexity based on stated experience level
- Keep topic names concise (2-5 words)
- Make descriptions actionable and specific

QUALITY CHECKLIST:
- Is the progression logical?
- Are topics appropriately sized (not too broad, not too narrow)?
- Do suggestions actually relate to the topic?
- Is this appropriate for the stated experience level?`;

export async function generateCurriculum(
  subject: string,
  experienceLevel: string,
  context?: string
): Promise<CurriculumOutput> {
  const userMessage = `Create a curriculum for: ${subject}

Student experience level: ${experienceLevel}
${context ? `Additional context: ${context}` : ""}

Return the curriculum as JSON.`;

  const response = await callAgent({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    agentConfig: AGENTS.curriculumArchitect,
    metadata: { subject, experienceLevel },
  });

  // Parse JSON from response
  try {
    // Extract JSON from potential markdown code blocks
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("[Curriculum Architect] Failed to parse JSON:", error);
    console.error("Raw response:", response.content);
    throw new Error("Failed to parse curriculum JSON");
  }
}
