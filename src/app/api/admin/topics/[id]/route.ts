import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { topics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === process.env.ADMIN_PASSWORD;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, chapterNumber, description, sortOrder, isActive } = await request.json();

  const [existing] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, id));

  if (!existing) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  await db
    .update(topics)
    .set({
      name: name ?? existing.name,
      chapterNumber: chapterNumber ?? existing.chapterNumber,
      description: description ?? existing.description,
      sortOrder: sortOrder ?? existing.sortOrder,
      isActive: isActive ?? existing.isActive,
      updatedAt: new Date(),
    })
    .where(eq(topics.id, id));

  const [updated] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, id));

  return NextResponse.json({ topic: updated });
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

  // Soft delete - just mark as inactive
  await db
    .update(topics)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(topics.id, id));

  return NextResponse.json({ success: true });
}
