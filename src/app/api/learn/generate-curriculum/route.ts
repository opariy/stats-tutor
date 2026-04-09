import { NextRequest, NextResponse } from "next/server";
import { generateCurriculum } from "@/lib/curriculum-generator";

export async function POST(request: NextRequest) {
  try {
    const { subjectDescription, level = 'intro' } = await request.json();

    if (!subjectDescription || typeof subjectDescription !== 'string') {
      return NextResponse.json(
        { error: "Subject description is required" },
        { status: 400 }
      );
    }

    if (subjectDescription.length < 10) {
      return NextResponse.json(
        { error: "Please provide a more detailed description (at least 10 characters)" },
        { status: 400 }
      );
    }

    if (subjectDescription.length > 1000) {
      return NextResponse.json(
        { error: "Description too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    const validLevels = ['intro', 'intermediate', 'advanced'];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: "Level must be 'intro', 'intermediate', or 'advanced'" },
        { status: 400 }
      );
    }

    const curriculum = await generateCurriculum(
      subjectDescription,
      level as 'intro' | 'intermediate' | 'advanced'
    );

    return NextResponse.json(curriculum);
  } catch (error) {
    console.error("Curriculum generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate curriculum" },
      { status: 500 }
    );
  }
}
