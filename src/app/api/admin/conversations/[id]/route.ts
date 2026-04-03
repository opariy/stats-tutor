import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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

  // Get user info
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get all messages for this user
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

  // Get feedback for this user's messages
  const userFeedback = await db
    .select({
      messageId: feedback.messageId,
      rating: feedback.rating,
      comment: feedback.comment,
    })
    .from(feedback)
    .where(eq(feedback.userId, id));

  // Create a map of message feedback
  const feedbackMap = new Map(
    userFeedback.map((f) => [f.messageId, { rating: f.rating, comment: f.comment }])
  );

  // Attach feedback to messages
  const messagesWithFeedback = userMessages.map((msg) => ({
    ...msg,
    feedback: feedbackMap.get(msg.id) || null,
  }));

  return NextResponse.json({
    user,
    messages: messagesWithFeedback,
  });
}
