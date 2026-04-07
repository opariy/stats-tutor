import { db } from "@/lib/db";
import { bugReports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Update bug report status
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["new", "in-progress", "resolved", "closed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const updateData: { status: "new" | "in-progress" | "resolved" | "closed"; resolvedAt?: Date | null } = { status };

    if (status === "resolved") {
      updateData.resolvedAt = new Date();
    } else if (status === "new" || status === "in-progress") {
      updateData.resolvedAt = null;
    }

    const [updated] = await db
      .update(bugReports)
      .set(updateData)
      .where(eq(bugReports.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error("Error updating bug report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}

// Delete bug report
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    await db.delete(bugReports).where(eq(bugReports.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bug report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
