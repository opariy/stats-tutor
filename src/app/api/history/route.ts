import { NextRequest, NextResponse } from "next/server";
import { db, users, messages, conversations } from "@/lib/db";
import { eq, asc, and } from "drizzle-orm";

// GET /api/history?conversationId=xxx OR ?sessionId=xxx (legacy)
export async function GET(request: NextRequest) {
  try {
    const conversationId = request.nextUrl.searchParams.get("conversationId");
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    // New conversation-based flow
    if (conversationId) {
      const history = await db
        .select({
          role: messages.role,
          content: messages.content,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.createdAt));

      return NextResponse.json({ messages: history });
    }

    // Legacy sessionId flow (backward compatible)
    if (!sessionId) {
      return NextResponse.json({ messages: [] });
    }

    const email = `anon-${sessionId}@stats-tutor.local`;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json({ messages: [] });
    }

    // For legacy: return all messages without conversationId
    const history = await db
      .select({
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(and(eq(messages.userId, user.id)))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({ messages: history });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ messages: [] });
  }
}
