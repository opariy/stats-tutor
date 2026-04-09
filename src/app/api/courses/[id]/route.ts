import { NextRequest, NextResponse } from "next/server";
import { db, courses, courseChapters, courseTopics, coursePrompts } from "@/lib/db";
import { eq, asc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch course
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, id),
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Fetch chapters with topics
    const chapters = await db.query.courseChapters.findMany({
      where: eq(courseChapters.courseId, id),
      orderBy: [asc(courseChapters.sortOrder)],
    });

    const topics = await db.query.courseTopics.findMany({
      where: eq(courseTopics.courseId, id),
      orderBy: [asc(courseTopics.sortOrder)],
    });

    // Fetch default prompt
    const prompt = await db.query.coursePrompts.findFirst({
      where: eq(coursePrompts.courseId, id),
    });

    // Group topics by chapter
    const chaptersWithTopics = chapters.map((chapter) => ({
      ...chapter,
      topics: topics.filter((t) => t.chapterId === chapter.id),
    }));

    return NextResponse.json({
      course: {
        ...course,
        chapters: chaptersWithTopics,
        prompt,
      },
    });
  } catch (error) {
    console.error("Failed to fetch course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
}
