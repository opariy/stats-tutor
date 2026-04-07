import { NextRequest, NextResponse } from "next/server";
import { getProfessorFromSession, verifyProfessorOwnsCourse } from "@/lib/professor-auth";
import { getMisconceptions } from "@/lib/professor-metrics";

export async function GET(request: NextRequest) {
  try {
    const professor = await getProfessorFromSession();

    if (!professor) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    // Verify professor owns this course
    const ownsCourse = await verifyProfessorOwnsCourse(professor.id, courseId);
    if (!ownsCourse) {
      return NextResponse.json(
        { error: "Not authorized to view this course" },
        { status: 403 }
      );
    }

    const misconceptions = await getMisconceptions(courseId);

    return NextResponse.json({ misconceptions });
  } catch (error) {
    console.error("Misconceptions error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
