import { NextRequest, NextResponse } from "next/server";
import {
  db,
  users,
  studentTopicStatus,
  studentObjectiveProgress,
  learningObjectives,
  courseTopics,
  courseChapters,
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
 * GET /api/progress - Get student's progress for a course
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");
    const courseId = url.searchParams.get("courseId");

    if (!sessionId || !courseId) {
      return NextResponse.json(
        { error: "sessionId and courseId are required" },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(sessionId);

    // Get all topics for this course with their chapters
    const topics = await db.query.courseTopics.findMany({
      where: eq(courseTopics.courseId, courseId),
      orderBy: [asc(courseTopics.sortOrder)],
    });

    // Get all topic statuses for this user
    const statuses = await db.query.studentTopicStatus.findMany({
      where: eq(studentTopicStatus.userId, user.id),
    });

    const statusMap = new Map(statuses.map((s) => [s.courseTopicId, s]));

    // Get all objectives for these topics
    const topicIds = topics.map((t) => t.id);
    const allObjectives = await db.query.learningObjectives.findMany({
      where: eq(learningObjectives.courseTopicId, topicIds[0]), // This needs to be fixed for multiple topics
    });

    // Get all objective progress for this user
    const objectiveProgress = await db.query.studentObjectiveProgress.findMany({
      where: eq(studentObjectiveProgress.userId, user.id),
    });
    const progressMap = new Map(objectiveProgress.map((p) => [p.objectiveId, p]));

    // Build response with topic progress
    const topicProgress = await Promise.all(
      topics.map(async (topic) => {
        const status = statusMap.get(topic.id);

        // Get objectives for this topic
        const objectives = await db.query.learningObjectives.findMany({
          where: eq(learningObjectives.courseTopicId, topic.id),
          orderBy: [asc(learningObjectives.sortOrder)],
        });

        const objectivesWithProgress = objectives.map((obj) => {
          const progress = progressMap.get(obj.id);
          return {
            id: obj.id,
            objective: obj.objective,
            checkMethod: obj.checkMethod,
            difficulty: obj.difficulty,
            status: progress?.status || "not_started",
            attempts: progress?.attempts || 0,
            passedAt: progress?.passedAt,
          };
        });

        const coreObjectives = objectivesWithProgress.filter((o) => o.difficulty === "core");
        const corePassedCount = coreObjectives.filter((o) => o.status === "passed").length;

        return {
          topicId: topic.id,
          topicSlug: topic.slug,
          topicName: topic.name,
          chapterId: topic.chapterId,
          status: status?.status || "locked",
          coreObjectivesPassed: corePassedCount,
          totalCoreObjectives: coreObjectives.length,
          objectives: objectivesWithProgress,
          unlockedAt: status?.unlockedAt,
          completedAt: status?.completedAt,
        };
      })
    );

    return NextResponse.json({
      userId: user.id,
      courseId,
      topics: topicProgress,
    });
  } catch (error) {
    console.error("Progress fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress - Update objective progress
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, objectiveId, status, conversationId } = await request.json();

    if (!sessionId || !objectiveId || !status) {
      return NextResponse.json(
        { error: "sessionId, objectiveId, and status are required" },
        { status: 400 }
      );
    }

    if (!["not_started", "attempted", "passed", "failed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(sessionId);

    // Get the objective to find its topic
    const objective = await db.query.learningObjectives.findFirst({
      where: eq(learningObjectives.id, objectiveId),
    });

    if (!objective) {
      return NextResponse.json(
        { error: "Objective not found" },
        { status: 404 }
      );
    }

    // Upsert the progress
    const existingProgress = await db.query.studentObjectiveProgress.findFirst({
      where: and(
        eq(studentObjectiveProgress.userId, user.id),
        eq(studentObjectiveProgress.objectiveId, objectiveId)
      ),
    });

    const now = new Date();
    const progressData = {
      userId: user.id,
      objectiveId,
      status,
      attempts: (existingProgress?.attempts || 0) + 1,
      lastAttemptAt: now,
      passedAt: status === "passed" ? now : existingProgress?.passedAt,
      conversationId: conversationId || existingProgress?.conversationId,
    };

    if (existingProgress) {
      await db
        .update(studentObjectiveProgress)
        .set(progressData)
        .where(eq(studentObjectiveProgress.id, existingProgress.id));
    } else {
      await db.insert(studentObjectiveProgress).values(progressData);
    }

    // Update topic status if this is a core objective that was passed
    if (status === "passed" && objective.difficulty === "core") {
      await updateTopicStatus(user.id, objective.courseTopicId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Progress update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update progress" },
      { status: 500 }
    );
  }
}

/**
 * Update topic status based on objective progress
 */
async function updateTopicStatus(userId: string, topicId: string) {
  // Get all core objectives for this topic
  const coreObjectives = await db.query.learningObjectives.findMany({
    where: and(
      eq(learningObjectives.courseTopicId, topicId),
      eq(learningObjectives.difficulty, "core")
    ),
  });

  // Get progress for these objectives
  const objectiveIds = coreObjectives.map((o) => o.id);
  const progress = await db.query.studentObjectiveProgress.findMany({
    where: and(
      eq(studentObjectiveProgress.userId, userId),
      eq(studentObjectiveProgress.objectiveId, objectiveIds[0]) // TODO: handle multiple
    ),
  });

  // Actually get all progress for this user's core objectives in this topic
  const allProgress = await db.query.studentObjectiveProgress.findMany({
    where: eq(studentObjectiveProgress.userId, userId),
  });
  const progressMap = new Map(allProgress.map((p) => [p.objectiveId, p]));

  const passedCount = coreObjectives.filter(
    (obj) => progressMap.get(obj.id)?.status === "passed"
  ).length;

  const allPassed = passedCount === coreObjectives.length && coreObjectives.length > 0;

  // Update or create topic status
  const existingStatus = await db.query.studentTopicStatus.findFirst({
    where: and(
      eq(studentTopicStatus.userId, userId),
      eq(studentTopicStatus.courseTopicId, topicId)
    ),
  });

  const newStatus = allPassed ? "quiz_ready" : "in_progress";

  if (existingStatus) {
    await db
      .update(studentTopicStatus)
      .set({
        status: newStatus,
        coreObjectivesPassed: passedCount,
        totalCoreObjectives: coreObjectives.length,
      })
      .where(eq(studentTopicStatus.id, existingStatus.id));
  } else {
    await db.insert(studentTopicStatus).values({
      userId,
      courseTopicId: topicId,
      status: newStatus,
      coreObjectivesPassed: passedCount,
      totalCoreObjectives: coreObjectives.length,
      unlockedAt: new Date(),
    });
  }
}
