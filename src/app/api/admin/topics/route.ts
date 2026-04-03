import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { topics, chapters } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

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

  const allChapters = await db
    .select()
    .from(chapters)
    .orderBy(asc(chapters.sortOrder));

  const allTopics = await db
    .select()
    .from(topics)
    .orderBy(asc(topics.chapterNumber), asc(topics.sortOrder));

  return NextResponse.json({ chapters: allChapters, topics: allTopics });
}

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, chapterNumber, description, sortOrder } = await request.json();

  if (!id || !name || !chapterNumber || !description) {
    return NextResponse.json(
      { error: "ID, name, chapter number, and description are required" },
      { status: 400 }
    );
  }

  // Check if topic ID already exists
  const [existing] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, id));

  if (existing) {
    return NextResponse.json(
      { error: "A topic with this ID already exists" },
      { status: 400 }
    );
  }

  await db.insert(topics).values({
    id,
    name,
    chapterNumber,
    description,
    sortOrder: sortOrder || 0,
    isActive: true,
  });

  const [newTopic] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, id));

  return NextResponse.json({ topic: newTopic });
}
