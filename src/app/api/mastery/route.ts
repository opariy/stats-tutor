import { NextRequest, NextResponse } from "next/server";
import { db, users, conversations, messages, topicMastery } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

// POST /api/mastery - Record topic mastery declaration
export async function POST(request: NextRequest) {
  try {
    const { sessionId, conversationId, topicId } = await request.json();

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    if (!topicId) {
      return NextResponse.json({ error: "topicId required" }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Get user from session
    const email = `anon-${sessionId}@stats-tutor.local`;
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate conversation exists and belongs to user
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, user.id)
      ),
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Validate at least one message exists in conversation
    const messageCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(eq(messages.conversationId, conversationId));

    if (!messageCount[0] || messageCount[0].count === 0) {
      return NextResponse.json(
        { error: "Cannot declare mastery on empty conversation" },
        { status: 400 }
      );
    }

    // Upsert mastery declaration (update if exists, insert if not)
    await db
      .insert(topicMastery)
      .values({
        userId: user.id,
        topicId,
        conversationId,
      })
      .onConflictDoUpdate({
        target: [topicMastery.userId, topicMastery.topicId],
        set: {
          conversationId,
          declaredAt: sql`now()`,
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mastery declaration error:", error);
    return NextResponse.json(
      { error: "Failed to record mastery declaration" },
      { status: 500 }
    );
  }
}

// GET /api/mastery?sessionId=xxx - Get mastered topics for user
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ masteredTopics: [] });
    }

    const email = `anon-${sessionId}@stats-tutor.local`;
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json({ masteredTopics: [] });
    }

    const mastered = await db
      .select({
        topicId: topicMastery.topicId,
        conversationId: topicMastery.conversationId,
        declaredAt: topicMastery.declaredAt,
      })
      .from(topicMastery)
      .where(eq(topicMastery.userId, user.id));

    return NextResponse.json({
      masteredTopics: mastered.map((m) => ({
        topicId: m.topicId,
        conversationId: m.conversationId,
        declaredAt: m.declaredAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get mastered topics error:", error);
    return NextResponse.json(
      { masteredTopics: [], error: "Failed to fetch mastered topics" },
      { status: 500 }
    );
  }
}
