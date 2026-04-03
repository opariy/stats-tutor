import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { systemPrompts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  const prompts = await db.select().from(systemPrompts);

  return NextResponse.json({ prompts });
}

export async function PUT(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, content, description } = await request.json();

  if (!name || !content) {
    return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
  }

  // Check if prompt exists
  const [existing] = await db
    .select()
    .from(systemPrompts)
    .where(eq(systemPrompts.name, name));

  if (existing) {
    // Update existing
    await db
      .update(systemPrompts)
      .set({
        content,
        description,
        updatedAt: new Date(),
      })
      .where(eq(systemPrompts.name, name));
  } else {
    // Create new
    await db.insert(systemPrompts).values({
      name,
      content,
      description,
    });
  }

  const [updated] = await db
    .select()
    .from(systemPrompts)
    .where(eq(systemPrompts.name, name));

  return NextResponse.json({ prompt: updated });
}
