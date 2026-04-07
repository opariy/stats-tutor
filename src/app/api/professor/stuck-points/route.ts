import { NextRequest, NextResponse } from "next/server";
import { getProfessorFromSession, verifyProfessorOwnsCourse } from "@/lib/professor-auth";
import { getStuckPoints } from "@/lib/professor-metrics";

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
    const days = parseInt(searchParams.get("days") || "7", 10);
    const includeExcerpts = searchParams.get("includeExcerpts") === "true";

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

    const stuckPoints = await getStuckPoints(courseId, days, includeExcerpts);

    return NextResponse.json({ stuckPoints });
  } catch (error) {
    console.error("Stuck points error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
