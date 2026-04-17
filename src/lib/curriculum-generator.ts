import Anthropic from "@anthropic-ai/sdk";

export interface GeneratedTopic {
  slug: string;
  name: string;
  description: string;
  suggestions: string[];
}

export interface GeneratedChapter {
  number: number;
  title: string;
  description?: string;
  topics: GeneratedTopic[];
}

export interface GeneratedCurriculum {
  courseName: string;
  chapters: GeneratedChapter[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Build a rich description from tool call parameters
 */
export async function generateCurriculumFromToolCall(
  subject: string,
  level: 'intro' | 'intermediate' | 'advanced',
  specificTopics?: string[],
  goals?: string[]
): Promise<GeneratedCurriculum> {
  // Build a rich description from the structured parameters
  let description = `I want to learn ${subject}`;

  if (specificTopics && specificTopics.length > 0) {
    description += `, focusing on ${specificTopics.join(', ')}`;
  }

  if (goals && goals.length > 0) {
    description += `. My goals: ${goals.join('; ')}`;
  }

  return generateCurriculum(description, level);
}

export async function generateCurriculum(
  description: string,
  level: 'intro' | 'intermediate' | 'advanced' = 'intro'
): Promise<GeneratedCurriculum> {
  const levelDescriptions = {
    intro: 'beginner-friendly, foundational concepts',
    intermediate: 'building on basics, more complex topics',
    advanced: 'in-depth, specialized knowledge'
  };

  const anthropic = new Anthropic();

  const curriculumSystemPrompt = `You are a curriculum designer. Generate well-structured learning curricula with clear progression from foundational to advanced concepts. Always output valid JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-0", // Use cheaper model for structured generation
    max_tokens: 4000,
    // Cache the system prompt
    system: [
      {
        type: "text",
        text: curriculumSystemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Generate a learning curriculum for:
"${description}"

Level: ${level} (${levelDescriptions[level]})

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "courseName": "Suggested course name",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter title",
      "description": "Brief chapter description",
      "topics": [
        {
          "slug": "topic-slug-lowercase-with-dashes",
          "name": "Topic Name",
          "description": "What this topic covers in 1-2 sentences",
          "suggestions": ["Example question 1?", "Example question 2?"]
        }
      ]
    }
  ]
}

Guidelines:
- Generate 5-8 chapters
- Each chapter should have 3-6 topics
- Topics should be specific and learnable in a single study session
- Slug should be URL-friendly (lowercase, dashes, no special chars)
- Each topic needs 2-3 starter question suggestions
- Order chapters from foundational to advanced concepts
- Make the curriculum practical and applicable

Return ONLY the JSON, nothing else.`
      }
    ],
  });

  // Parse the JSON response
  const textBlock = response.content[0];
  if (textBlock.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  const text = textBlock.text.trim();

  // Try to extract JSON if wrapped in code blocks
  let jsonText = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  try {
    const curriculum = JSON.parse(jsonText) as GeneratedCurriculum;

    // Validate and sanitize the response
    if (!curriculum.courseName || !Array.isArray(curriculum.chapters)) {
      throw new Error('Invalid curriculum structure');
    }

    // Ensure all slugs are valid
    curriculum.chapters = curriculum.chapters.map((chapter, chapterIndex) => ({
      ...chapter,
      number: chapterIndex + 1,
      topics: (chapter.topics || []).map(topic => ({
        ...topic,
        slug: topic.slug || slugify(topic.name),
        suggestions: topic.suggestions || [],
      })),
    }));

    return curriculum;
  } catch {
    throw new Error(`Failed to parse curriculum: ${text.substring(0, 200)}`);
  }
}

/**
 * Generate a focused prerequisite module for a specific concept
 * This creates a single chapter with 2-4 topics to quickly fill a knowledge gap
 */
export interface PrerequisiteModule {
  chapterTitle: string;
  chapterDescription: string;
  topics: GeneratedTopic[];
  estimatedMinutes: number;
}

export async function generatePrerequisiteModule(
  concept: string,
  context: string,  // e.g., "learning statistics" - helps tailor the prerequisite content
  evidence?: string  // What showed the gap - helps focus the module
): Promise<PrerequisiteModule> {
  const anthropic = new Anthropic();

  const systemPrompt = `You are a curriculum designer specializing in prerequisite remediation. Generate focused, efficient review modules that quickly fill knowledge gaps. Always output valid JSON.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-0",
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Generate a focused prerequisite review module for:

Concept: "${concept}"
Context: Student is ${context}
${evidence ? `Evidence of gap: ${evidence}` : ''}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "chapterTitle": "Quick Review: [Concept Name]",
  "chapterDescription": "Brief description of what this review covers",
  "estimatedMinutes": 15,
  "topics": [
    {
      "slug": "topic-slug",
      "name": "Topic Name",
      "description": "What this topic covers",
      "suggestions": ["Practice question 1?", "Practice question 2?"]
    }
  ]
}

Guidelines:
- Keep it SHORT: 2-4 topics maximum
- Focus only on what's needed for the main subject
- Each topic should be completable in 5-10 minutes
- Include practical practice questions in suggestions
- Estimated time should be realistic (typically 15-30 minutes total)
- Make it feel like a "refresher" not a full course

Return ONLY the JSON, nothing else.`
      }
    ],
  });

  const textBlock = response.content[0];
  if (textBlock.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  const text = textBlock.text.trim();

  let jsonText = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  try {
    const module = JSON.parse(jsonText) as PrerequisiteModule;

    if (!module.chapterTitle || !Array.isArray(module.topics)) {
      throw new Error('Invalid prerequisite module structure');
    }

    // Ensure all slugs are valid
    module.topics = module.topics.map(topic => ({
      ...topic,
      slug: topic.slug || slugify(topic.name),
      suggestions: topic.suggestions || [],
    }));

    return module;
  } catch {
    throw new Error(`Failed to parse prerequisite module: ${text.substring(0, 200)}`);
  }
}
