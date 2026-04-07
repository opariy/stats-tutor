import { NextRequest, NextResponse } from "next/server";
import { db, users, courses, courseEnrollments } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, courseCode } = await request.json();

    if (!email || !courseCode) {
      return NextResponse.json(
        { error: "Email and course code are required" },
        { status: 400 }
      );
    }

    // Find course by code
    const course = await db.query.courses.findFirst({
      where: eq(courses.code, courseCode),
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Create or find user
    let user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          group: "krokyo",
        })
        .returning();
      user = newUser;
    }

    // Check if already enrolled
    const existingEnrollment = await db.query.courseEnrollments.findFirst({
      where: and(
        eq(courseEnrollments.courseId, course.id),
        eq(courseEnrollments.userId, user.id)
      ),
    });

    if (!existingEnrollment) {
      // Enroll student
      await db.insert(courseEnrollments).values({
        courseId: course.id,
        userId: user.id,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      course: {
        id: course.id,
        name: course.name,
        code: course.code,
      },
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
