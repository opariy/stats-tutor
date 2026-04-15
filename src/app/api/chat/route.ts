import { NextRequest, NextResponse } from "next/server";
import { getPromptForGroup } from "@/lib/prompts";
import {
  db, users, messages, conversations, courses, courseChapters,
  courseTopics, coursePrompts, learningObjectives, studentObjectiveProgress,
  studentTopicStatus, prerequisiteGaps
} from "@/lib/db";
import { eq, sql, asc, and } from "drizzle-orm";
import { logApiError } from "@/lib/api-error-logger";
import { streamTutorResponseWithPlan, type TutorContext } from "@/lib/agents";

async function getOrCreateUser(sessionId: string, group: "krokyo" | "control") {
  const isEmail = sessionId.includes("@") && !sessionId.startsWith("anon-");
  const email = isEmail ? sessionId.toLowerCase() : `anon-${sessionId}@stats-tutor.local`;

  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({ email, group })
      .returning();
    user = newUser;
  }

  return user;
}

interface ObjectiveWithProgress {
  id: string;
  objective: string;
  checkMethod: "conversational" | "quiz_mcq" | "quiz_free_text";
  status: "not_started" | "attempted" | "passed" | "failed";
}

async function getCourseContext(
  courseId: string,
  userId?: string,
  topicId?: string
): Promise<TutorContext | null> {
  try {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });

    if (!course) return null;

    const chapters = await db.query.courseChapters.findMany({
      where: eq(courseChapters.courseId, courseId),
      orderBy: [asc(courseChapters.sortOrder)],
    });

    const topics = await db.query.courseTopics.findMany({
      where: eq(courseTopics.courseId, courseId),
      orderBy: [asc(courseTopics.sortOrder)],
    });

    const prompt = await db.query.coursePrompts.findFirst({
      where: eq(coursePrompts.courseId, courseId),
    });

    // Build topics list string
    const topicsList = chapters
      .map((ch) => {
        const chapterTopics = topics.filter((t) => t.chapterId === ch.id);
        const topicNames = chapterTopics.map((t) => t.name).join(", ");
        return `- Chapter ${ch.number}: ${ch.title} (${topicNames})`;
      })
      .join("\n");

    // Get objectives if topic is specified
    let objectives: ObjectiveWithProgress[] | undefined;
    let currentTopicName: string | undefined;

    if (topicId && userId) {
      const topic = await db.query.courseTopics.findFirst({
        where: eq(courseTopics.id, topicId),
      });

      if (topic) {
        currentTopicName = topic.name;

        const topicObjectives = await db.query.learningObjectives.findMany({
          where: eq(learningObjectives.courseTopicId, topicId),
          orderBy: [asc(learningObjectives.sortOrder)],
        });

        if (topicObjectives.length > 0) {
          const progress = await db.query.studentObjectiveProgress.findMany({
            where: eq(studentObjectiveProgress.userId, userId),
          });
          const progressMap = new Map(progress.map((p) => [p.objectiveId, p]));

          objectives = topicObjectives.map((obj) => {
            const prog = progressMap.get(obj.id);
            return {
              id: obj.id,
              objective: obj.objective,
              checkMethod: obj.checkMethod as "conversational" | "quiz_mcq" | "quiz_free_text",
              status: (prog?.status as "not_started" | "attempted" | "passed" | "failed") || "not_started",
            };
          });
        }
      }
    }

    return {
      courseName: course.name,
      courseDescription: course.subjectDescription || undefined,
      topicsList,
      teachingStyle: (prompt?.teachingStyle as "direct" | "socratic" | "guided") || "guided",
      objectives,
      currentTopicName,
    };
  } catch (error) {
    console.error("Failed to get course context:", error);
    return null;
  }
}

/**
 * Parse OBJECTIVE_UPDATE tags from AI response and update progress
 */
async function parseAndUpdateObjectiveProgress(
  content: string,
  userId: string,
  conversationId?: string
): Promise<void> {
  const regex = /<!-- OBJECTIVE_UPDATE: ({[^}]+}) -->/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    try {
      const data = JSON.parse(match[1]) as { objective_id: string; status: string };

      if (!data.objective_id || !data.status) continue;
      if (!["passed", "failed", "attempted"].includes(data.status)) continue;

      const existingProgress = await db.query.studentObjectiveProgress.findFirst({
        where: and(
          eq(studentObjectiveProgress.userId, userId),
          eq(studentObjectiveProgress.objectiveId, data.objective_id)
        ),
      });

      const now = new Date();
      const progressData = {
        userId,
        objectiveId: data.objective_id,
        status: data.status as "passed" | "failed" | "attempted",
        attempts: (existingProgress?.attempts || 0) + 1,
        lastAttemptAt: now,
        passedAt: data.status === "passed" ? now : existingProgress?.passedAt,
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

      if (data.status === "passed") {
        const objective = await db.query.learningObjectives.findFirst({
          where: eq(learningObjectives.id, data.objective_id),
        });

        if (objective && objective.difficulty === "core") {
          await updateTopicStatusAfterProgress(userId, objective.courseTopicId);
        }
      }
    } catch (e) {
      console.error("Failed to parse objective update:", e);
    }
  }
}

async function updateTopicStatusAfterProgress(userId: string, topicId: string): Promise<void> {
  try {
    const coreObjectives = await db.query.learningObjectives.findMany({
      where: and(
        eq(learningObjectives.courseTopicId, topicId),
        eq(learningObjectives.difficulty, "core")
      ),
    });

    const allProgress = await db.query.studentObjectiveProgress.findMany({
      where: eq(studentObjectiveProgress.userId, userId),
    });
    const progressMap = new Map(allProgress.map((p) => [p.objectiveId, p]));

    const passedCount = coreObjectives.filter(
      (obj) => progressMap.get(obj.id)?.status === "passed"
    ).length;

    const allConversationalPassed = coreObjectives
      .filter((obj) => obj.checkMethod === "conversational")
      .every((obj) => progressMap.get(obj.id)?.status === "passed");

    let newStatus: "in_progress" | "quiz_ready" = "in_progress";
    if (allConversationalPassed && coreObjectives.some((obj) => obj.checkMethod !== "conversational")) {
      newStatus = "quiz_ready";
    }

    const existingStatus = await db.query.studentTopicStatus.findFirst({
      where: and(
        eq(studentTopicStatus.userId, userId),
        eq(studentTopicStatus.courseTopicId, topicId)
      ),
    });

    if (existingStatus) {
      await db
        .update(studentTopicStatus)
        .set({
          status: newStatus,
          coreObjectivesPassed: passedCount,
        })
        .where(eq(studentTopicStatus.id, existingStatus.id));
    }
  } catch (error) {
    console.error("Failed to update topic status:", error);
  }
}

/**
 * Parse PREREQUISITE_GAP tags from AI response and store in database
 */
async function parseAndStorePrerequisiteGaps(
  content: string,
  userId: string,
  courseId?: string,
  topicId?: string,
  conversationId?: string
): Promise<void> {
  const regex = /<!-- PREREQUISITE_GAP: ({[^}]+}) -->/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    try {
      const data = JSON.parse(match[1]) as {
        concept: string;
        evidence: string;
        severity: "blocking" | "slowing";
      };

      if (!data.concept || !data.evidence || !data.severity) continue;
      if (!["blocking", "slowing"].includes(data.severity)) continue;

      // Check if we already have this gap for this user+course+concept
      const existingGap = await db.query.prerequisiteGaps.findFirst({
        where: and(
          eq(prerequisiteGaps.userId, userId),
          courseId ? eq(prerequisiteGaps.courseId, courseId) : undefined,
          eq(prerequisiteGaps.concept, data.concept),
          eq(prerequisiteGaps.status, "detected")
        ),
      });

      // Only insert if not already detected (avoid duplicates)
      if (!existingGap && courseId) {
        await db.insert(prerequisiteGaps).values({
          userId,
          courseId,
          courseTopicId: topicId || null,
          conversationId: conversationId || null,
          concept: data.concept,
          evidence: data.evidence,
          severity: data.severity,
          status: "detected",
        });

        console.log(`[Prerequisite Gap] Detected: ${data.concept} (${data.severity}) for user ${userId}`);
      }
    } catch (e) {
      console.error("Failed to parse prerequisite gap:", e);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages: chatMessages, group = "krokyo", sessionId, conversationId, courseId, topicId } = await request.json();

    let user = null;
    if (sessionId) {
      user = await getOrCreateUser(sessionId, group as "krokyo" | "control");
    }

    const startTime = Date.now();

    // Log user's message
    if (sessionId && user) {
      const lastUserMessage = chatMessages[chatMessages.length - 1];
      if (lastUserMessage?.role === "user") {
        await db.insert(messages).values({
          userId: user.id,
          conversationId: conversationId || null,
          role: "user",
          content: lastUserMessage.content,
        });
      }

      if (conversationId) {
        await db
          .update(conversations)
          .set({ updatedAt: sql`NOW()` })
          .where(eq(conversations.id, conversationId));
      }
    }

    // Get tutor context
    let tutorContext: TutorContext | null = null;
    if (courseId) {
      tutorContext = await getCourseContext(courseId, user?.id, topicId);
    }

    // Fallback to simple prompt if no course context
    if (!tutorContext) {
      const defaultPrompt = getPromptForGroup(group as "krokyo" | "control");
      tutorContext = {
        courseName: "Statistics",
        topicsList: "Any statistics topic",
        teachingStyle: "guided",
      };
    }

    // Stream response using Tutor agent with structured planning
    const { stream, plan, newState } = await streamTutorResponseWithPlan(
      chatMessages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tutorContext
    );

    console.log("[Chat] Teaching plan:", plan.currentPhase, "→", plan.nextPhase, plan.canAdvanceToNextTopic ? "(can advance)" : "");

    // Create readable stream for response
    const encoder = new TextEncoder();
    let fullText = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const text of stream) {
            fullText += text;
            controller.enqueue(encoder.encode(text));
          }

          // Log assistant message when done
          if (user) {
            const responseTimeMs = Date.now() - startTime;
            const cleanContent = fullText
              .replace(/<!-- OBJECTIVE_UPDATE: [^>]+ -->/g, "")
              .replace(/<!-- PREREQUISITE_GAP: [^>]+ -->/g, "")
              .trim();

            await db.insert(messages).values({
              userId: user.id,
              conversationId: conversationId || null,
              role: "assistant",
              content: cleanContent,
              responseTimeMs,
            });

            // Process objective updates
            if (fullText.includes("OBJECTIVE_UPDATE")) {
              parseAndUpdateObjectiveProgress(fullText, user.id, conversationId)
                .catch((err) => console.error("Objective update failed:", err));
            }

            // Process prerequisite gap detections
            if (fullText.includes("PREREQUISITE_GAP")) {
              parseAndStorePrerequisiteGaps(fullText, user.id, courseId, topicId, conversationId)
                .catch((err) => console.error("Prerequisite gap storage failed:", err));
            }

            // Auto-tag and generate title
            if (conversationId) {
              const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

              fetch(`${baseUrl}/api/tag-topics`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId }),
              }).catch((err) => console.error("Topic tagging failed:", err));

              if (chatMessages.length <= 2) {
                fetch(`${baseUrl}/api/conversations/${conversationId}/generate-title`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                }).catch((err) => console.error("Title generation failed:", err));
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);

    const { sessionId } = await request.clone().json().catch(() => ({}));
    await logApiError(
      "/api/chat",
      500,
      error instanceof Error ? error.message : "Unknown error",
      sessionId
    );

    return NextResponse.json(
      { error: "Failed to get response" },
      { status: 500 }
    );
  }
}
