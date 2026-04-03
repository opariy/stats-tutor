import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") || "all";

  try {
    if (type === "users" || type === "all") {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          group: users.group,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(asc(users.createdAt));

      if (type === "users") {
        const csv = generateCSV(allUsers, ["id", "email", "group", "createdAt"]);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="users_${Date.now()}.csv"`,
          },
        });
      }
    }

    if (type === "messages" || type === "all") {
      const allMessages = await db
        .select({
          id: messages.id,
          userId: messages.userId,
          role: messages.role,
          content: messages.content,
          responseTimeMs: messages.responseTimeMs,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .orderBy(asc(messages.createdAt));

      if (type === "messages") {
        const csv = generateCSV(allMessages, [
          "id",
          "userId",
          "role",
          "content",
          "responseTimeMs",
          "createdAt",
        ]);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="messages_${Date.now()}.csv"`,
          },
        });
      }
    }

    if (type === "feedback" || type === "all") {
      const allFeedback = await db
        .select({
          id: feedback.id,
          messageId: feedback.messageId,
          userId: feedback.userId,
          rating: feedback.rating,
          comment: feedback.comment,
          createdAt: feedback.createdAt,
        })
        .from(feedback)
        .orderBy(asc(feedback.createdAt));

      if (type === "feedback") {
        const csv = generateCSV(allFeedback, [
          "id",
          "messageId",
          "userId",
          "rating",
          "comment",
          "createdAt",
        ]);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="feedback_${Date.now()}.csv"`,
          },
        });
      }
    }

    // Export all data combined with user group info
    if (type === "all") {
      const allData = await db
        .select({
          oderId: messages.id,
          sessionId: users.email,
          group: users.group,
          role: messages.role,
          content: messages.content,
          responseTimeMs: messages.responseTimeMs,
          messageCreatedAt: messages.createdAt,
          userCreatedAt: users.createdAt,
        })
        .from(messages)
        .innerJoin(users, eq(messages.userId, users.id))
        .orderBy(asc(users.createdAt), asc(messages.createdAt));

      const csv = generateCSV(allData, [
        "orderId",
        "sessionId",
        "group",
        "role",
        "content",
        "responseTimeMs",
        "messageCreatedAt",
        "userCreatedAt",
      ]);

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="stats_tutor_export_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function generateCSV(data: Record<string, unknown>[], columns: string[]): string {
  if (data.length === 0) {
    return columns.join(",") + "\n";
  }

  const header = columns.join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col];
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}
