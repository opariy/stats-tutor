import { NextRequest, NextResponse } from "next/server";
import { db, conversations, messages, messageTags, topics } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";

// GET /api/conversations/[id] - Get a single conversation's details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get topic name if topicId exists
    let topicName = null;
    if (conversation.topicId) {
      const topic = await db.query.topics.findFirst({
        where: eq(topics.id, conversation.topicId),
      });
      topicName = topic?.name || null;
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        topicId: conversation.topicId,
        topicName,
        title: conversation.title,
        createdAt: conversation.createdAt?.toISOString(),
        updatedAt: conversation.updatedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] - Delete a conversation and its messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Get all message IDs for this conversation
    const conversationMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      columns: { id: true },
    });

    const messageIds = conversationMessages.map((m) => m.id);

    // Delete message tags first (foreign key constraint)
    if (messageIds.length > 0) {
      await db.delete(messageTags).where(inArray(messageTags.messageId, messageIds));
    }

    // Delete messages
    await db.delete(messages).where(eq(messages.conversationId, conversationId));

    // Delete conversation
    await db.delete(conversations).where(eq(conversations.id, conversationId));

    return NextResponse.json({ success: true, deleted: conversationId });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
