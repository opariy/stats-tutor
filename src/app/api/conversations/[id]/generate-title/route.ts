import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// POST /api/conversations/[id]/generate-title - Generate title from conversation content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Check if conversation already has a title
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Skip if already has a meaningful title
    if (conversation.title && conversation.title.trim().length > 0) {
      return NextResponse.json({ title: conversation.title, skipped: true });
    }

    // Get first few messages to generate title
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: asc(messages.createdAt),
      limit: 4, // First 2 exchanges
    });

    if (recentMessages.length < 2) {
      // Need at least one exchange to generate meaningful title
      return NextResponse.json({ title: "", skipped: true });
    }

    // Combine messages into context
    const messageContext = recentMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    // Use Claude to generate a short title
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Generate a very short title (3-6 words max) for this statistics tutoring conversation. The title should describe what the student is asking about. Return ONLY the title, no quotes, no explanation.

CONVERSATION:
${messageContext}

Title:`,
        },
      ],
    });

    // Parse the response
    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ title: "", error: "No text response" });
    }

    const title = content.text.trim().slice(0, 100); // Cap at 100 chars

    // Update conversation title
    await db
      .update(conversations)
      .set({ title })
      .where(eq(conversations.id, conversationId));

    return NextResponse.json({ title, generated: true });
  } catch (error) {
    console.error("Generate title error:", error);
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
  }
}
