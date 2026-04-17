import { NextRequest, NextResponse } from "next/server";
import {
  db,
  users,
  learningObjectives,
  studentObjectiveProgress,
  courseTopics,
  topicQuizResults,
} from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { generateQuiz } from "@/lib/agents";

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
 * POST /api/quiz/generate - Generate quiz questions for a topic
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, topicId } = await request.json();

    if (!sessionId || !topicId) {
      return NextResponse.json(
        { error: "sessionId and topicId are required" },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(sessionId);

    // Get the topic
    const topic = await db.query.courseTopics.findFirst({
      where: eq(courseTopics.id, topicId),
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    // Get quiz objectives (MCQ and free text) that haven't been passed yet
    const objectives = await db.query.learningObjectives.findMany({
      where: eq(learningObjectives.courseTopicId, topicId),
      orderBy: [asc(learningObjectives.sortOrder)],
    });

    const quizObjectives = objectives.filter(
      (obj) => obj.checkMethod === "quiz_mcq" || obj.checkMethod === "quiz_free_text"
    );

    if (quizObjectives.length === 0) {
      return NextResponse.json({
        questions: [],
        message: "No quiz objectives for this topic",
      });
    }

    // Get progress to filter out already passed objectives
    const progress = await db.query.studentObjectiveProgress.findMany({
      where: eq(studentObjectiveProgress.userId, user.id),
    });
    const progressMap = new Map(progress.map((p) => [p.objectiveId, p]));

    const unpassed = quizObjectives.filter(
      (obj) => progressMap.get(obj.id)?.status !== "passed"
    );

    // If all quiz objectives are passed, include all for review
    const objectivesToQuiz = unpassed.length > 0 ? unpassed : quizObjectives;

    // Generate questions using Quiz Generator agent
    const quizOutput = await generateQuiz(
      objectivesToQuiz.map((obj) => ({
        id: obj.id,
        objective: obj.objective,
        checkMethod: obj.checkMethod as "quiz_mcq" | "quiz_free_text",
      })),
      topic.name
    );

    // Store the quiz in the database
    const [quizResult] = await db
      .insert(topicQuizResults)
      .values({
        userId: user.id,
        courseTopicId: topicId,
        quizType: "end_of_topic",
        questionsJson: quizOutput.questions,
        answersJson: null,
        score: null,
        passed: false,
      })
      .returning();

    return NextResponse.json({
      quizId: quizResult.id,
      topicName: topic.name,
      questions: quizOutput.questions.map((q) => ({
        objectiveId: q.objectiveId,
        question: q.question,
        type: q.type,
        options: q.options,
        // Don't send correct answer to client
      })),
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
