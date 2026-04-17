import { NextRequest, NextResponse } from "next/server";
import {
  db,
  courses,
  courseChapters,
  courseTopics,
  prerequisiteGaps,
} from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { generatePrerequisiteModule } from "@/lib/curriculum-generator";

/**
 * POST /api/courses/[id]/add-prerequisite
 *
 * Generates and inserts a prerequisite module into an existing course
 * when a knowledge gap is detected.
 *
 * Body:
 * - gapId: ID of the prerequisite gap to address
 * - concept: The prerequisite concept (e.g., "percentages")
 * - evidence?: What showed the gap
 * - insertAfterChapterId?: Where to insert (default: beginning)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const { gapId, concept, evidence, insertAfterChapterId } = await request.json();

    if (!concept) {
      return NextResponse.json(
        { error: "concept is required" },
        { status: 400 }
      );
    }

    // Verify course exists
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Get existing chapters to determine sort order
    const existingChapters = await db.query.courseChapters.findMany({
      where: eq(courseChapters.courseId, courseId),
      orderBy: [asc(courseChapters.sortOrder)],
    });

    // Determine where to insert
    let insertSortOrder = 0;
    if (insertAfterChapterId) {
      const afterChapter = existingChapters.find(c => c.id === insertAfterChapterId);
      if (afterChapter && afterChapter.sortOrder !== null) {
        insertSortOrder = afterChapter.sortOrder + 1;
      }
    }

    // Shift existing chapters down to make room
    for (const chapter of existingChapters) {
      if ((chapter.sortOrder ?? 0) >= insertSortOrder) {
        await db
          .update(courseChapters)
          .set({
            sortOrder: (chapter.sortOrder ?? 0) + 1,
            number: (chapter.number ?? 0) + 1,
          })
          .where(eq(courseChapters.id, chapter.id));
      }
    }

    // Generate the prerequisite module
    const context = `learning ${course.name}`;
    const prereqModule = await generatePrerequisiteModule(concept, context, evidence);

    // Insert the prerequisite chapter
    const [newChapter] = await db
      .insert(courseChapters)
      .values({
        courseId,
        number: insertSortOrder === 0 ? 0 : insertSortOrder,  // Chapter 0 for prerequisites
        title: prereqModule.chapterTitle,
        description: prereqModule.chapterDescription,
        sortOrder: insertSortOrder,
      })
      .returning();

    // Insert the topics
    const insertedTopics = [];
    for (let i = 0; i < prereqModule.topics.length; i++) {
      const topic = prereqModule.topics[i];
      const [insertedTopic] = await db
        .insert(courseTopics)
        .values({
          courseId,
          chapterId: newChapter.id,
          slug: `prereq-${concept.toLowerCase().replace(/\s+/g, '-')}-${topic.slug}`,
          name: topic.name,
          description: topic.description,
          suggestions: topic.suggestions,
          sortOrder: i,
          source: "ai_generated",
        })
        .returning();
      insertedTopics.push(insertedTopic);
    }

    // Update the gap status if gapId provided
    if (gapId) {
      await db
        .update(prerequisiteGaps)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
          prerequisiteChapterId: newChapter.id,
        })
        .where(eq(prerequisiteGaps.id, gapId));
    }

    console.log(`[Add Prerequisite] Added "${prereqModule.chapterTitle}" to course ${courseId}`);

    return NextResponse.json({
      success: true,
      chapter: {
        id: newChapter.id,
        title: newChapter.title,
        description: newChapter.description,
        topicCount: insertedTopics.length,
      },
      estimatedMinutes: prereqModule.estimatedMinutes,
      message: `Added prerequisite module: ${prereqModule.chapterTitle}`,
    });
  } catch (error) {
    console.error("Add prerequisite error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add prerequisite" },
      { status: 500 }
    );
  }
}
