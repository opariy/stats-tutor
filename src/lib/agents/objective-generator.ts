/**
 * Objective Generator Agent
 * Creates learning objectives for topics
 */

import { callAgent } from "./base";
import { AGENTS } from "./types";

export interface LearningObjectiveOutput {
  objectives: Array<{
    objective: string;
    checkMethod: "conversational" | "quiz_mcq" | "quiz_free_text";
    difficulty: "core" | "advanced";
  }>;
}

const SYSTEM_PROMPT = `You are a learning objectives specialist. Your job is to create measurable learning objectives for educational topics.

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure:
{
  "objectives": [
    {
      "objective": "Describe what the student should be able to do",
      "checkMethod": "conversational" | "quiz_mcq" | "quiz_free_text",
      "difficulty": "core" | "advanced"
    }
  ]
}

CHECK METHODS:
- "conversational": Can be verified through discussion (understanding concepts, explaining ideas)
- "quiz_mcq": Best tested with multiple choice (facts, definitions, comparisons)
- "quiz_free_text": Requires written explanation or calculation

DIFFICULTY:
- "core": Essential knowledge - student must pass these to complete the topic
- "advanced": Nice-to-have - optional deeper understanding

RULES:
- Create 3-5 objectives per topic
- At least 2 should be "core" difficulty
- Mix of check methods (not all the same)
- Objectives should be specific and measurable
- Use action verbs: explain, calculate, identify, compare, apply
- Avoid vague verbs: understand, know, learn

GOOD: "Calculate a 95% confidence interval for a sample mean"
BAD: "Understand confidence intervals"`;

export async function generateObjectives(
  topicName: string,
  topicDescription: string,
  courseName?: string
): Promise<LearningObjectiveOutput> {
  const userMessage = `Create learning objectives for this topic:

Topic: ${topicName}
Description: ${topicDescription}
${courseName ? `Course: ${courseName}` : ""}

Return the objectives as JSON.`;

  const response = await callAgent({
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    agentConfig: AGENTS.objectiveGenerator,
    metadata: { topicName },
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
    console.error("[Objective Generator] Failed to parse JSON:", error);
    console.error("Raw response:", response.content);
    throw new Error("Failed to parse objectives JSON");
  }
}

/**
 * Generate objectives for multiple topics in batch
 */
export async function generateObjectivesBatch(
  topics: Array<{ id: string; name: string; description: string }>,
  courseName?: string,
  concurrency: number = 3
): Promise<Map<string, LearningObjectiveOutput>> {
  const results = new Map<string, LearningObjectiveOutput>();

  // Process in batches for concurrency control
  for (let i = 0; i < topics.length; i += concurrency) {
    const batch = topics.slice(i, i + concurrency);
    const promises = batch.map(async (topic) => {
      try {
        const objectives = await generateObjectives(
          topic.name,
          topic.description,
          courseName
        );
        results.set(topic.id, objectives);
      } catch (error) {
        console.error(`Failed to generate objectives for ${topic.name}:`, error);
        // Return empty objectives on failure
        results.set(topic.id, { objectives: [] });
      }
    });
    await Promise.all(promises);
  }

  return results;
}
