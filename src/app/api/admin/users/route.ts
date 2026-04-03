import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === process.env.ADMIN_PASSWORD;
}

export async function GET() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      group: users.group,
      createdAt: users.createdAt,
      messageCount: sql<number>`count(distinct ${messages.id})`,
      thumbsUp: sql<number>`count(*) filter (where ${feedback.rating} = 'up')`,
      thumbsDown: sql<number>`count(*) filter (where ${feedback.rating} = 'down')`,
    })
    .from(users)
    .leftJoin(messages, eq(messages.userId, users.id))
    .leftJoin(feedback, eq(feedback.userId, users.id))
    .groupBy(users.id, users.email, users.group, users.createdAt)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ users: userList });
}
