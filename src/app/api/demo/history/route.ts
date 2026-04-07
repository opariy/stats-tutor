import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, conversations } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
  }

  try {
    // Verify this is a demo conversation (using isDemo flag)
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.isDemo, true)
        )
      );

    if (!conversation) {
      return NextResponse.json(
        { error: "Demo conversation not found" },
        { status: 404 }
      );
    }

    // Get messages for this conversation
    const conversationMessages = await db
      .select({
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({ messages: conversationMessages });
  } catch (error) {
    console.error("Failed to fetch demo history:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
