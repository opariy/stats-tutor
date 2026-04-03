import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === process.env.ADMIN_PASSWORD;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get message stats
  const [stats] = await db
    .select({
      totalMessages: sql<number>`count(*)`,
      userMessages: sql<number>`count(*) filter (where ${messages.role} = 'user')`,
      assistantMessages: sql<number>`count(*) filter (where ${messages.role} = 'assistant')`,
      avgResponseTime: sql<number>`round(avg(${messages.responseTimeMs}))`,
    })
    .from(messages)
    .where(eq(messages.userId, id));

  // Get feedback stats
  const [feedbackStats] = await db
    .select({
      total: sql<number>`count(*)`,
      thumbsUp: sql<number>`count(*) filter (where ${feedback.rating} = 'up')`,
      thumbsDown: sql<number>`count(*) filter (where ${feedback.rating} = 'down')`,
    })
    .from(feedback)
    .where(eq(feedback.userId, id));

  // Get all messages with feedback
  const userMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      responseTimeMs: messages.responseTimeMs,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.userId, id))
    .orderBy(asc(messages.createdAt));

  const userFeedback = await db
    .select({
      messageId: feedback.messageId,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
    .where(eq(feedback.userId, id));

  return NextResponse.json({
    user,
    stats,
    feedbackStats,
    messages: userMessages,
    feedback: userFeedback,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Delete in order: feedback -> messages -> sessions -> user
  await db.delete(feedback).where(eq(feedback.userId, id));
  await db.delete(messages).where(eq(messages.userId, id));
  await db.delete(users).where(eq(users.id, id));

  return NextResponse.json({ success: true });
}
