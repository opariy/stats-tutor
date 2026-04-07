import { NextRequest, NextResponse } from "next/server";
import { getProfessorFromSession, verifyProfessorOwnsCourse } from "@/lib/professor-auth";
import { getStudentDetail } from "@/lib/professor-metrics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const professor = await getProfessorFromSession();

    if (!professor) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id: studentId } = await params;
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

    const student = await getStudentDetail(courseId, studentId);

    if (!student) {
      return NextResponse.json(
        { error: "Student not found in this course" },
        { status: 404 }
      );
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Student detail error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
