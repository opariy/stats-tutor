import Anthropic from "@anthropic-ai/sdk";

export interface GeneratedObjective {
  objective: string;
  checkMethod: "conversational" | "quiz_mcq" | "quiz_free_text";
  difficulty: "core" | "advanced";
}

export interface TopicObjectives {
  topicId: string;
  topicName: string;
  objectives: GeneratedObjective[];
}

/**
 * Generate learning objectives for a single topic
 * Objective count scales with topic complexity
 */
export async function generateObjectivesForTopic(
  topicName: string,
  topicDescription: string | null,
  courseName: string,
  complexity: "simple" | "moderate" | "complex" = "moderate"
): Promise<GeneratedObjective[]> {
  const anthropic = new Anthropic();

  // Scale objectives based on complexity
  const objectiveRanges = {
    simple: { min: 2, max: 3, core: "2", advanced: "0-1" },
    moderate: { min: 3, max: 4, core: "2-3", advanced: "1" },
    complex: { min: 5, max: 7, core: "3-4", advanced: "2-3" },
  };
  const range = objectiveRanges[complexity];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-0",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Generate learning objectives for this topic:

Course: "${courseName}"
Topic: "${topicName}"
Complexity: ${complexity}
${topicDescription ? `Description: "${topicDescription}"` : ""}

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "objectives": [
    {
      "objective": "Clear, specific learning objective starting with action verb",
      "checkMethod": "conversational|quiz_mcq|quiz_free_text",
      "difficulty": "core|advanced"
    }
  ]
}

Guidelines:
- Generate ${range.min}-${range.max} objectives (this is a ${complexity} topic)
- ${range.core} should be "core" difficulty (must pass to complete topic)
- ${range.advanced} should be "advanced" difficulty (optional mastery)
- Each objective should be specific and measurable
- checkMethod types:
  * "conversational" - can be assessed during tutoring conversation
  * "quiz_mcq" - best assessed with multiple choice (definitions, recognition)
  * "quiz_free_text" - requires explaining/calculating (application, analysis)
- Start objectives with action verbs: Explain, Calculate, Identify, Compare, Apply, Analyze
- Objectives should progress from understanding to application

Example for SIMPLE topic "Mean":
{
  "objectives": [
    { "objective": "Calculate the mean of a dataset", "checkMethod": "conversational", "difficulty": "core" },
    { "objective": "Explain when mean is appropriate vs median", "checkMethod": "quiz_mcq", "difficulty": "core" }
  ]
}

Example for COMPLEX topic "Hypothesis Testing":
{
  "objectives": [
    { "objective": "State null and alternative hypotheses for a given scenario", "checkMethod": "conversational", "difficulty": "core" },
    { "objective": "Calculate test statistics for one-sample tests", "checkMethod": "quiz_free_text", "difficulty": "core" },
    { "objective": "Interpret p-values in context", "checkMethod": "conversational", "difficulty": "core" },
    { "objective": "Choose appropriate significance level for different scenarios", "checkMethod": "quiz_mcq", "difficulty": "core" },
    { "objective": "Distinguish between Type I and Type II errors", "checkMethod": "conversational", "difficulty": "advanced" },
    { "objective": "Calculate and interpret statistical power", "checkMethod": "quiz_free_text", "difficulty": "advanced" }
  ]
}

Return ONLY the JSON for a ${complexity.toUpperCase()} topic with ${range.min}-${range.max} objectives.`
      }
    ],
  });

  const textBlock = response.content[0];
  if (textBlock.type !== "text") {
    throw new Error("Unexpected response type");
  }

  let jsonText = textBlock.text.trim();

  // Try to extract JSON if wrapped in code blocks
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  try {
    const result = JSON.parse(jsonText) as { objectives: GeneratedObjective[] };

    if (!Array.isArray(result.objectives)) {
      throw new Error("Invalid objectives structure");
    }

    // Validate and sanitize
    return result.objectives.map((obj, index) => ({
      objective: obj.objective || `Understand ${topicName}`,
      checkMethod: ["conversational", "quiz_mcq", "quiz_free_text"].includes(obj.checkMethod)
        ? obj.checkMethod
        : "conversational",
      difficulty: ["core", "advanced"].includes(obj.difficulty)
        ? obj.difficulty
        : index < 3 ? "core" : "advanced",
    }));
  } catch {
    // Return default objectives if parsing fails
    return [
      {
        objective: `Explain the key concepts of ${topicName}`,
        checkMethod: "conversational" as const,
        difficulty: "core" as const,
      },
      {
        objective: `Apply ${topicName} to solve problems`,
        checkMethod: "quiz_free_text" as const,
        difficulty: "core" as const,
      },
      {
        objective: `Identify common misconceptions about ${topicName}`,
        checkMethod: "quiz_mcq" as const,
        difficulty: "advanced" as const,
      },
    ];
  }
}

// Keywords that indicate topic complexity
const COMPLEX_KEYWORDS = [
  "hypothesis", "regression", "anova", "inference", "bayesian", "multivariate",
  "correlation", "significance", "confidence interval", "sampling distribution",
  "chi-square", "t-test", "z-test", "power analysis", "effect size"
];

const SIMPLE_KEYWORDS = [
  "mean", "median", "mode", "range", "frequency", "bar chart", "pie chart",
  "percentage", "ratio", "table", "graph", "data collection", "survey"
];

/**
 * Estimate topic complexity based on name and description
 */
function estimateComplexity(
  topicName: string,
  description: string | null
): "simple" | "moderate" | "complex" {
  const text = `${topicName} ${description || ""}`.toLowerCase();

  const complexCount = COMPLEX_KEYWORDS.filter(k => text.includes(k)).length;
  const simpleCount = SIMPLE_KEYWORDS.filter(k => text.includes(k)).length;

  if (complexCount >= 2) return "complex";
  if (complexCount >= 1 && simpleCount === 0) return "complex";
  if (simpleCount >= 2 && complexCount === 0) return "simple";
  if (simpleCount >= 1 && complexCount === 0) return "simple";

  return "moderate";
}

/**
 * Generate learning objectives for all topics in a course
 * Returns map of topicId -> objectives
 * Complexity is auto-detected based on topic name/description
 */
export async function generateObjectivesForCourse(
  topics: Array<{ id: string; name: string; description: string | null }>,
  courseName: string
): Promise<Map<string, GeneratedObjective[]>> {
  const results = new Map<string, GeneratedObjective[]>();

  // Process topics in parallel with a limit
  const batchSize = 3;
  for (let i = 0; i < topics.length; i += batchSize) {
    const batch = topics.slice(i, i + batchSize);
    const promises = batch.map(async (topic) => {
      try {
        const complexity = estimateComplexity(topic.name, topic.description);
        const objectives = await generateObjectivesForTopic(
          topic.name,
          topic.description,
          courseName,
          complexity
        );
        return { topicId: topic.id, objectives };
      } catch (error) {
        console.error(`Failed to generate objectives for ${topic.name}:`, error);
        // Return default objectives on failure
        return {
          topicId: topic.id,
          objectives: [
            {
              objective: `Explain the key concepts of ${topic.name}`,
              checkMethod: "conversational" as const,
              difficulty: "core" as const,
            },
            {
              objective: `Apply ${topic.name} concepts to solve problems`,
              checkMethod: "quiz_free_text" as const,
              difficulty: "core" as const,
            },
          ],
        };
      }
    });

    const batchResults = await Promise.all(promises);
    for (const result of batchResults) {
      results.set(result.topicId, result.objectives);
    }
  }

  return results;
}
