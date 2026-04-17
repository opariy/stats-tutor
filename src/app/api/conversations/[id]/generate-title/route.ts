import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { generateTitle } from "@/lib/agents";

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

    // Get first user and assistant messages
    const firstUserMsg = recentMessages.find((m) => m.role === "user");
    const firstAssistantMsg = recentMessages.find((m) => m.role === "assistant");

    if (!firstUserMsg) {
      return NextResponse.json({ title: "", skipped: true });
    }

    // Use Title Generator agent
    const title = await generateTitle(
      firstUserMsg.content,
      firstAssistantMsg?.content
    );

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
