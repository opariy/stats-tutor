import { NextRequest, NextResponse } from "next/server";
import { db, users, messages } from "@/lib/db";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");

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

    const history = await db
      .select({
        role: messages.role,
        content: messages.content,
      })
      .from(messages)
      .where(eq(messages.userId, user.id))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({ messages: history });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ messages: [] });
  }
}
