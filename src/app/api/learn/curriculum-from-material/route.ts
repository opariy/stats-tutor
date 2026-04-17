import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db, courses, courseChapters, courseTopics, courseMaterials, users, learningObjectives, studentTopicStatus } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import type { GeneratedCurriculum } from "@/lib/curriculum-generator";
import { generateObjectivesForCourse } from "@/lib/objective-generator";

function generateCourseCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { text, fileName, fileType, sessionId } = await request.json();

        if (!text || typeof text !== "string") {
          send({ type: "error", error: "No text content provided" });
          controller.close();
          return;
        }

        if (!sessionId) {
          send({ type: "error", error: "Session ID is required" });
          controller.close();
          return;
        }

        send({ type: "status", status: "generating_curriculum" });

        // Generate curriculum from the extracted material
        const anthropic = new Anthropic();

        const systemPrompt = `You are a curriculum designer. Analyze the provided course material (syllabus, textbook outline, study guide, or notes) and generate a structured learning curriculum based on it. Always output valid JSON.`;

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-0",
          max_tokens: 4000,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `Analyze this course material and generate a learning curriculum:

---
${text}
---

Based on this material, create a structured curriculum.

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "courseName": "Descriptive course name based on the material",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter title from the material",
      "description": "Brief chapter description",
      "topics": [
        {
          "slug": "topic-slug-lowercase-with-dashes",
          "name": "Topic Name",
          "description": "What this topic covers in 1-2 sentences",
          "suggestions": ["Study question 1?", "Study question 2?"]
        }
      ]
    }
  ]
}

Guidelines:
- Extract the actual structure from the material (chapters, units, modules, sections)
- Preserve the original organization and topic names where possible
- If the material has no clear structure, organize it logically
- Generate 2-3 starter questions for each topic based on the material
- Slugs should be URL-friendly (lowercase, dashes, no special chars)
- Each topic should be learnable in a single study session

Return ONLY the JSON, nothing else.`,
            },
          ],
        });

        const textBlock = response.content[0];
        if (textBlock.type !== "text") {
          send({ type: "error", error: "Unexpected response type" });
          controller.close();
          return;
        }

        let jsonText = textBlock.text.trim();
        const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1].trim();
        }

        let curriculum: GeneratedCurriculum;
        try {
          curriculum = JSON.parse(jsonText);

          if (!curriculum.courseName || !Array.isArray(curriculum.chapters)) {
            throw new Error("Invalid curriculum structure");
          }

          // Ensure all slugs are valid
          curriculum.chapters = curriculum.chapters.map((chapter, chapterIndex) => ({
            ...chapter,
            number: chapterIndex + 1,
            topics: (chapter.topics || []).map((topic) => ({
              ...topic,
              slug: topic.slug || slugify(topic.name),
              suggestions: topic.suggestions || [],
            })),
          }));
        } catch {
          send({ type: "error", error: "Failed to parse generated curriculum" });
          controller.close();
          return;
        }

        send({ type: "curriculum", curriculum });
        send({ type: "status", status: "creating_course" });

        // Create the course
        const user = await getOrCreateUser(sessionId);

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

        const [course] = await db
          .insert(courses)
          .values({
            name: curriculum.courseName,
            code: courseCode,
            curriculumMode: "material_extracted",
            subjectDescription: `Generated from uploaded file: ${fileName}`,
            isSelfServe: true,
            ownerUserId: user.id,
          })
          .returning();

        // Save the course material
        await db.insert(courseMaterials).values({
          courseId: course.id,
          name: fileName,
          type: fileType || "text",
          textContent: text,
          processed: true,
        });

        // Create chapters and topics
        const createdTopics: Array<{ id: string; name: string; description: string | null }> = [];

        for (const chapter of curriculum.chapters) {
          const [createdChapter] = await db
            .insert(courseChapters)
            .values({
              courseId: course.id,
              number: chapter.number,
              title: chapter.title,
              description: chapter.description || null,
              sortOrder: chapter.number,
            })
            .returning();

          for (let i = 0; i < chapter.topics.length; i++) {
            const topic = chapter.topics[i];
            const [createdTopic] = await db
              .insert(courseTopics)
              .values({
                courseId: course.id,
                chapterId: createdChapter.id,
                slug: topic.slug,
                name: topic.name,
                description: topic.description || null,
                suggestions: topic.suggestions || [],
                sortOrder: i,
                source: "material_extracted",
              })
              .returning();

            createdTopics.push({
              id: createdTopic.id,
              name: createdTopic.name,
              description: createdTopic.description,
            });
          }
        }

        // Generate learning objectives (async, don't block response)
        generateObjectivesForCourse(createdTopics, course.name)
          .then(async (objectivesMap) => {
            for (const [topicId, objectives] of objectivesMap) {
              const coreCount = objectives.filter((o) => o.difficulty === "core").length;

              for (let i = 0; i < objectives.length; i++) {
                const obj = objectives[i];
                await db.insert(learningObjectives).values({
                  courseTopicId: topicId,
                  objective: obj.objective,
                  checkMethod: obj.checkMethod,
                  difficulty: obj.difficulty,
                  sortOrder: i,
                });
              }

              const isFirstTopic = createdTopics[0]?.id === topicId;
              await db
                .insert(studentTopicStatus)
                .values({
                  userId: user.id,
                  courseTopicId: topicId,
                  status: isFirstTopic ? "in_progress" : "locked",
                  coreObjectivesPassed: 0,
                  totalCoreObjectives: coreCount,
                  unlockedAt: isFirstTopic ? new Date() : null,
                })
                .onConflictDoNothing();
            }
          })
          .catch((err) => console.error("Failed to generate objectives:", err));

        send({
          type: "complete",
          courseId: course.id,
          courseCode: course.code,
          redirectUrl: `/study?course=${course.id}`,
        });

        controller.close();
      } catch (error) {
        console.error("Curriculum generation error:", error);
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Failed to generate curriculum",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
