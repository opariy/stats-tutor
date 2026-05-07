import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { topicName, topicId, courseContext } = await request.json();

    if (!topicName) {
      return NextResponse.json(
        { error: "Topic name is required" },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Generate 8-10 flashcards for studying "${topicName}"${courseContext ? ` in the context of ${courseContext}` : ""}.

Each flashcard should have:
- A clear, concise question or prompt on the front
- A focused answer on the back (2-3 sentences max)
- Mix of definition cards, concept cards, and application cards

Return as JSON array:
[
  {
    "id": "1",
    "front": "What is...",
    "back": "...",
    "type": "definition" | "concept" | "application"
  }
]

Only return the JSON array, no other text.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Parse the JSON from the response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const flashcards = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      topicId,
      topicName,
      flashcards,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}
