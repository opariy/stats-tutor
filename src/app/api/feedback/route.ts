import { NextRequest, NextResponse } from "next/server";
import { db, users, messages, feedback } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, messageIndex, rating, comment } = await request.json();

    if (!sessionId || messageIndex === undefined || !["up", "down"].includes(rating)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const email = `anon-${sessionId}@stats-tutor.local`;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the message at the given index (assistant messages only)
    const userMessages = await db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, user.id), eq(messages.role, "assistant")))
      .orderBy(messages.createdAt);

    const message = userMessages[messageIndex];

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if feedback already exists for this message
    const existingFeedback = await db.query.feedback.findFirst({
      where: and(
        eq(feedback.messageId, message.id),
        eq(feedback.userId, user.id)
      ),
    });

    if (existingFeedback) {
      // Update existing feedback
      await db
        .update(feedback)
        .set({ rating, comment: comment || null })
        .where(eq(feedback.id, existingFeedback.id));
    } else {
      // Create new feedback
      await db.insert(feedback).values({
        messageId: message.id,
        userId: user.id,
        rating,
        comment: comment || null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
