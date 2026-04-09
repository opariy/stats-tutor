import { NextRequest, NextResponse } from "next/server";
import { db, courses, courseChapters, courseTopics, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import type { GeneratedCurriculum } from "@/lib/curriculum-generator";

function generateCourseCode(): string {
  // Generate a random 6-character alphanumeric code
  return randomBytes(3).toString('hex').toUpperCase();
}

async function getOrCreateUser(sessionId: string) {
  const isEmail = sessionId.includes("@") && !sessionId.startsWith("anon-");
  const email = isEmail ? sessionId.toLowerCase() : `anon-${sessionId}@stats-tutor.local`;

  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({ email, group: "krokyo" })
      .returning();
    user = newUser;
  }

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      subjectDescription,
      curriculum,
      sessionId
    } = await request.json() as {
      name: string;
      subjectDescription: string;
      curriculum: GeneratedCurriculum;
      sessionId: string;
    };

    // Validate inputs
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: "Course name is required" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!curriculum || !Array.isArray(curriculum.chapters)) {
      return NextResponse.json(
        { error: "Valid curriculum is required" },
        { status: 400 }
      );
    }

    // Get or create user
    const user = await getOrCreateUser(sessionId);

    // Generate a unique course code
    let courseCode = generateCourseCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.query.courses.findFirst({
        where: eq(courses.code, courseCode),
      });
      if (!existing) break;
      courseCode = generateCourseCode();
      attempts++;
    }

    // Create the course
    const [course] = await db.insert(courses).values({
      name,
      code: courseCode,
      curriculumMode: 'auto_generated',
      subjectDescription,
      isSelfServe: true,
      ownerUserId: user.id,
    }).returning();

    // Create chapters and topics
    for (const chapter of curriculum.chapters) {
      const [createdChapter] = await db.insert(courseChapters).values({
        courseId: course.id,
        number: chapter.number,
        title: chapter.title,
        description: chapter.description || null,
        sortOrder: chapter.number,
      }).returning();

      // Create topics for this chapter
      for (let i = 0; i < chapter.topics.length; i++) {
        const topic = chapter.topics[i];
        await db.insert(courseTopics).values({
          courseId: course.id,
          chapterId: createdChapter.id,
          slug: topic.slug,
          name: topic.name,
          description: topic.description || null,
          suggestions: topic.suggestions || [],
          sortOrder: i,
          source: 'ai_generated',
        });
      }
    }

    return NextResponse.json({
      courseId: course.id,
      courseCode: course.code,
      redirectUrl: `/study?course=${course.id}`,
    });
  } catch (error) {
    console.error("Course creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create course" },
      { status: 500 }
    );
  }
}
