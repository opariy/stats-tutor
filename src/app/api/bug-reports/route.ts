import { db, users } from "@/lib/db";
import { bugReports } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

// Submit a new bug report / feedback
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { type, title, description, page, sessionId } = body;

    if (!type || !title || !description) {
      return NextResponse.json(
        { error: "Type, title, and description are required" },
        { status: 400 }
      );
    }

    if (!["bug", "feedback", "feature"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be bug, feedback, or feature" },
        { status: 400 }
      );
    }

    // Try to find user by sessionId if provided
    let userId: string | null = null;
    if (sessionId) {
      const email = sessionId.includes("@")
        ? sessionId.toLowerCase()
        : `anon-${sessionId}@stats-tutor.local`;
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      userId = user?.id || null;
    }

    const [report] = await db.insert(bugReports).values({
      userId,
      type,
      title,
      description,
      page: page || null,
    }).returning();

    return NextResponse.json({ success: true, id: report.id });
  } catch (error) {
    console.error("Error submitting bug report:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

// Get all bug reports (for admin)
export async function GET() {
  try {
    const reports = await db.query.bugReports.findMany({
      with: {
        user: true,
      },
      orderBy: [desc(bugReports.createdAt)],
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching bug reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
