import { NextResponse } from "next/server";
import { getProfessorWithCourses } from "@/lib/professor-auth";

export async function GET() {
  try {
    const professor = await getProfessorWithCourses();

    if (!professor) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: professor.id,
      email: professor.email,
      name: professor.name,
      courses: professor.courses.map((course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
      })),
    });
  } catch (error) {
    console.error("Professor me error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
