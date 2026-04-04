import { db, apiErrors, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function logApiError(
  endpoint: string,
  statusCode: number,
  errorMessage: string | null,
  sessionId?: string
): Promise<void> {
  try {
    let userId: string | null = null;

    if (sessionId) {
      const email = `anon-${sessionId}@stats-tutor.local`;
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      userId = user?.id || null;
    }

    await db.insert(apiErrors).values({
      endpoint,
      statusCode,
      errorMessage,
      userId,
    });
  } catch (logError) {
    // Don't let logging errors crash the app
    console.error("Failed to log API error:", logError);
  }
}
