import { NextRequest, NextResponse } from "next/server";
import { db, users, conversations, messages, topics } from "@/lib/db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { logApiError } from "@/lib/api-error-logger";

// Get user from sessionId
async function getUserFromSession(sessionId: string) {
  const email = `anon-${sessionId}@stats-tutor.local`;
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

// GET /api/conversations?sessionId=xxx&topicId=xxx (optional)
// - No topicId: return ALL conversations
// - topicId=general: return only conversations with null topicId
// - topicId=xyz: return only conversations with that topicId
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const topicIdParam = request.nextUrl.searchParams.get("topicId");

    if (!sessionId) {
      return NextResponse.json({ conversations: [] });
    }

    const user = await getUserFromSession(sessionId);
    if (!user) {
      return NextResponse.json({ conversations: [] });
    }

    // Build query conditions
    const conditions = [eq(conversations.userId, user.id)];
    if (topicIdParam === "general") {
      // Filter for conversations with null topicId
      conditions.push(sql`${conversations.topicId} IS NULL`);
    } else if (topicIdParam) {
      // Filter for specific topicId
      conditions.push(eq(conversations.topicId, topicIdParam));
    }
    // If no topicIdParam, return ALL conversations (no additional filter)

    // Get conversations with message count and topic name
    const result = await db
      .select({
        id: conversations.id,
        topicId: conversations.topicId,
        topicName: topics.name,
        title: conversations.title,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        messageCount: count(messages.id),
      })
      .from(conversations)
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .leftJoin(topics, eq(topics.id, conversations.topicId))
      .where(and(...conditions))
      .groupBy(conversations.id, topics.name)
      .orderBy(desc(conversations.updatedAt));

    return NextResponse.json({
      conversations: result.map((c) => ({
        id: c.id,
        topicId: c.topicId,
        topicName: c.topicName,
        title: c.title,
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
        messageCount: Number(c.messageCount),
      })),
    });
  } catch (error) {
    console.error("Get conversations error:", error);

    const sessionId = request.nextUrl.searchParams.get("sessionId");
    await logApiError(
      "/api/conversations",
      500,
      error instanceof Error ? error.message : "Unknown error",
      sessionId || undefined
    );

    return NextResponse.json({ conversations: [], error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const { sessionId, topicId, group = "krokyo" } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    // Get or create user
    const email = `anon-${sessionId}@stats-tutor.local`;
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({ email, group })
        .returning();
      user = newUser;
    }

    // Check for recent conversation to prevent rapid duplicates (within 2 seconds)
    if (topicId) {
      const recentConversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.userId, user.id),
          eq(conversations.topicId, topicId),
          sql`${conversations.createdAt} > NOW() - INTERVAL '2 seconds'`
        ),
        orderBy: desc(conversations.createdAt),
      });

      if (recentConversation) {
        return NextResponse.json({ conversation: recentConversation });
      }
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(conversations)
      .values({
        userId: user.id,
        topicId: topicId || null,
        title: "",
      })
      .returning();

    return NextResponse.json({ conversation: newConversation });
  } catch (error) {
    console.error("Create conversation error:", error);

    const { sessionId } = await request.clone().json().catch(() => ({}));
    await logApiError(
      "/api/conversations",
      500,
      error instanceof Error ? error.message : "Unknown error",
      sessionId
    );

    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
