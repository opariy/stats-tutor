import { NextRequest, NextResponse } from "next/server";
import {
  db,
  users,
  studentTopicStatus,
  courseTopics,
  courseChapters,
  learningObjectives,
} from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";

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

/**
 * POST /api/progress/unlock - Unlock the next topic after quiz passed
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, completedTopicId } = await request.json();

    if (!sessionId || !completedTopicId) {
      return NextResponse.json(
        { error: "sessionId and completedTopicId are required" },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(sessionId);

    // Get the completed topic
    const completedTopic = await db.query.courseTopics.findFirst({
      where: eq(courseTopics.id, completedTopicId),
    });

    if (!completedTopic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    // Mark completed topic as completed
    await db
      .update(studentTopicStatus)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(
        and(
          eq(studentTopicStatus.userId, user.id),
          eq(studentTopicStatus.courseTopicId, completedTopicId)
        )
      );

    // Find the next topic in the course
    const allTopics = await db.query.courseTopics.findMany({
      where: eq(courseTopics.courseId, completedTopic.courseId),
      orderBy: [asc(courseTopics.sortOrder)],
    });

    // Get all chapters to properly order topics
    const chapters = await db.query.courseChapters.findMany({
      where: eq(courseChapters.courseId, completedTopic.courseId),
      orderBy: [asc(courseChapters.sortOrder)],
    });

    // Sort topics by chapter order, then by topic sortOrder
    const chapterOrder = new Map(chapters.map((c, i) => [c.id, i]));
    const sortedTopics = allTopics.sort((a, b) => {
      const chapterDiff = (chapterOrder.get(a.chapterId) || 0) - (chapterOrder.get(b.chapterId) || 0);
      if (chapterDiff !== 0) return chapterDiff;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    // Find current topic index and get next
    const currentIndex = sortedTopics.findIndex((t) => t.id === completedTopicId);
    const nextTopic = sortedTopics[currentIndex + 1];

    if (nextTopic) {
      // Get core objectives count for the next topic
      const coreObjectives = await db.query.learningObjectives.findMany({
        where: and(
          eq(learningObjectives.courseTopicId, nextTopic.id),
          eq(learningObjectives.difficulty, "core")
        ),
      });

      // Check if status already exists
      const existingStatus = await db.query.studentTopicStatus.findFirst({
        where: and(
          eq(studentTopicStatus.userId, user.id),
          eq(studentTopicStatus.courseTopicId, nextTopic.id)
        ),
      });

      if (existingStatus) {
        // Update to in_progress if it was locked
        if (existingStatus.status === "locked") {
          await db
            .update(studentTopicStatus)
            .set({
              status: "in_progress",
              unlockedAt: new Date(),
            })
            .where(eq(studentTopicStatus.id, existingStatus.id));
        }
      } else {
        // Create new status as in_progress
        await db.insert(studentTopicStatus).values({
          userId: user.id,
          courseTopicId: nextTopic.id,
          status: "in_progress",
          coreObjectivesPassed: 0,
          totalCoreObjectives: coreObjectives.length,
          unlockedAt: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        unlockedTopicId: nextTopic.id,
        unlockedTopicName: nextTopic.name,
      });
    }

    // No more topics - course complete!
    return NextResponse.json({
      success: true,
      courseCompleted: true,
    });
  } catch (error) {
    console.error("Unlock error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to unlock topic" },
      { status: 500 }
    );
  }
}
