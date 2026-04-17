import { NextRequest, NextResponse } from "next/server";
import {
  db,
  users,
  topicQuizResults,
  studentObjectiveProgress,
  studentTopicStatus,
  prerequisiteGaps,
  courseTopics,
} from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { evaluateAnswer } from "@/lib/agents";

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

interface Answer {
  objectiveId: string;
  answer: string;
}

interface EvaluatedAnswer extends Answer {
  isCorrect: boolean;
  explanation?: string;
}

/**
 * POST /api/quiz/submit - Submit and evaluate quiz answers
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, quizId, answers } = await request.json() as {
      sessionId: string;
      quizId: string;
      answers: Answer[];
    };

    if (!sessionId || !quizId || !answers) {
      return NextResponse.json(
        { error: "sessionId, quizId, and answers are required" },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(sessionId);

    // Get the quiz
    const quiz = await db.query.topicQuizResults.findFirst({
      where: and(
        eq(topicQuizResults.id, quizId),
        eq(topicQuizResults.userId, user.id)
      ),
    });

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (quiz.completedAt) {
      return NextResponse.json(
        { error: "Quiz already completed" },
        { status: 400 }
      );
    }

    // Evaluate answers
    const evaluatedAnswers = await evaluateAnswers(
      quiz.questionsJson as Array<{
        objectiveId: string;
        question: string;
        type: "mcq" | "free_text";
        options?: string[];
        correctAnswer?: string;
      }>,
      answers
    );

    // Calculate score
    const correctCount = evaluatedAnswers.filter((a) => a.isCorrect).length;
    const totalCount = evaluatedAnswers.length;
    const score = Math.round((correctCount / totalCount) * 100);
    const passed = score >= 70;

    // Update quiz result
    await db
      .update(topicQuizResults)
      .set({
        answersJson: evaluatedAnswers,
        score,
        passed,
        completedAt: new Date(),
      })
      .where(eq(topicQuizResults.id, quizId));

    // Update objective progress
    for (const evalAnswer of evaluatedAnswers) {
      const existingProgress = await db.query.studentObjectiveProgress.findFirst({
        where: and(
          eq(studentObjectiveProgress.userId, user.id),
          eq(studentObjectiveProgress.objectiveId, evalAnswer.objectiveId)
        ),
      });

      const now = new Date();
      const status = evalAnswer.isCorrect ? "passed" : "failed";

      if (existingProgress) {
        await db
          .update(studentObjectiveProgress)
          .set({
            status,
            attempts: existingProgress.attempts + 1,
            lastAttemptAt: now,
            passedAt: evalAnswer.isCorrect ? now : existingProgress.passedAt,
          })
          .where(eq(studentObjectiveProgress.id, existingProgress.id));
      } else {
        await db.insert(studentObjectiveProgress).values({
          userId: user.id,
          objectiveId: evalAnswer.objectiveId,
          status,
          attempts: 1,
          lastAttemptAt: now,
          passedAt: evalAnswer.isCorrect ? now : null,
        });
      }
    }

    // If passed, update topic status and unlock next topic
    if (passed) {
      await db
        .update(studentTopicStatus)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(
          and(
            eq(studentTopicStatus.userId, user.id),
            eq(studentTopicStatus.courseTopicId, quiz.courseTopicId)
          )
        );

      // Check if this topic is part of a prerequisite chapter and mark gap as resolved
      const topic = await db.query.courseTopics.findFirst({
        where: eq(courseTopics.id, quiz.courseTopicId),
      });

      if (topic) {
        // Find any gaps that have this topic's chapter as the prerequisite chapter
        const relatedGaps = await db.query.prerequisiteGaps.findMany({
          where: and(
            eq(prerequisiteGaps.userId, user.id),
            eq(prerequisiteGaps.prerequisiteChapterId, topic.chapterId),
            eq(prerequisiteGaps.status, "acknowledged")
          ),
        });

        // Mark gaps as resolved
        for (const gap of relatedGaps) {
          await db
            .update(prerequisiteGaps)
            .set({
              status: "resolved",
              resolvedAt: new Date(),
            })
            .where(eq(prerequisiteGaps.id, gap.id));

          console.log(`[Prerequisite Gap] Resolved: ${gap.concept} for user ${user.id}`);
        }
      }
    }

    return NextResponse.json({
      quizId,
      score,
      passed,
      correctCount,
      totalCount,
      results: evaluatedAnswers.map((a) => ({
        objectiveId: a.objectiveId,
        isCorrect: a.isCorrect,
        explanation: a.explanation,
      })),
      message: passed
        ? "Congratulations! You passed the quiz. The next topic is now unlocked!"
        : `You scored ${score}%. You need 70% to pass. Review the concepts and try again.`,
    });
  } catch (error) {
    console.error("Quiz submission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit quiz" },
      { status: 500 }
    );
  }
}

async function evaluateAnswers(
  questions: Array<{
    objectiveId: string;
    question: string;
    type: "mcq" | "free_text";
    options?: string[];
    correctAnswer?: string;
  }>,
  answers: Answer[]
): Promise<EvaluatedAnswer[]> {
  const answerMap = new Map(answers.map((a) => [a.objectiveId, a.answer]));
  const results: EvaluatedAnswer[] = [];

  for (const question of questions) {
    const studentAnswer = answerMap.get(question.objectiveId) || "";

    if (question.type === "mcq") {
      // MCQ: exact match (case insensitive)
      const isCorrect =
        studentAnswer.toUpperCase().trim() ===
        (question.correctAnswer || "").toUpperCase().trim();

      results.push({
        objectiveId: question.objectiveId,
        answer: studentAnswer,
        isCorrect,
        explanation: isCorrect
          ? "Correct!"
          : `The correct answer was ${question.correctAnswer}.`,
      });
    } else {
      // Free text: use Evaluator agent
      if (!studentAnswer.trim()) {
        results.push({
          objectiveId: question.objectiveId,
          answer: studentAnswer,
          isCorrect: false,
          explanation: "No answer provided.",
        });
        continue;
      }

      const evaluation = await evaluateAnswer(
        question.question,
        question.correctAnswer || "",
        studentAnswer
      );

      results.push({
        objectiveId: question.objectiveId,
        answer: studentAnswer,
        isCorrect: evaluation.isCorrect,
        explanation: evaluation.feedback,
      });
    }
  }

  return results;
}
