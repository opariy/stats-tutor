import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getGeneralSystemPrompt } from "@/lib/topics";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const systemPrompt = getGeneralSystemPrompt();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
