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

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
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
