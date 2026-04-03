import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLogin from "./admin-login";

async function getStats() {
  const [userStats] = await db
    .select({
      total: sql<number>`count(*)`,
      krokyo: sql<number>`count(*) filter (where "group" = 'krokyo')`,
      control: sql<number>`count(*) filter (where "group" = 'control')`,
    })
    .from(users);

  const [messageStats] = await db
    .select({
      total: sql<number>`count(*)`,
      userMessages: sql<number>`count(*) filter (where role = 'user')`,
      assistantMessages: sql<number>`count(*) filter (where role = 'assistant')`,
    })
    .from(messages);

  const [feedbackStats] = await db
    .select({
      total: sql<number>`count(*)`,
      thumbsUp: sql<number>`count(*) filter (where rating = 'up')`,
      thumbsDown: sql<number>`count(*) filter (where rating = 'down')`,
    })
    .from(feedback);

  return {
    users: userStats,
    messages: messageStats,
    feedback: feedbackStats,
  };
}

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token === process.env.ADMIN_PASSWORD;
}

export default async function AdminPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <AdminLogin />;
  }

  const stats = await getStats();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Stats 101 Admin</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Users */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Participants
            </h2>
            <p className="text-3xl font-bold text-gray-900">{stats.users.total}</p>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>Krokyo (Socratic): {stats.users.krokyo}</p>
              <p>Control (Direct): {stats.users.control}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Questions Asked
            </h2>
            <p className="text-3xl font-bold text-gray-900">{stats.messages.userMessages}</p>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>Total messages: {stats.messages.total}</p>
              <p>Responses: {stats.messages.assistantMessages}</p>
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
              Feedback
            </h2>
            <p className="text-3xl font-bold text-gray-900">{stats.feedback.total}</p>
            <div className="mt-4 space-y-1 text-sm text-gray-600">
              <p>Thumbs up: {stats.feedback.thumbsUp}</p>
              <p>Thumbs down: {stats.feedback.thumbsDown}</p>
              {stats.feedback.total > 0 && (
                <p className="font-medium">
                  Satisfaction:{" "}
                  {Math.round((stats.feedback.thumbsUp / stats.feedback.total) * 100)}%
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Experiment Status</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Design:</span> Between-subjects (Krokyo vs Control)
            </p>
            <p>
              <span className="font-medium">Krokyo group:</span> Socratic method (asks questions
              before giving answers)
            </p>
            <p>
              <span className="font-medium">Control group:</span> Direct answers (gives complete
              explanations immediately)
            </p>
            <p>
              <span className="font-medium">Assignment:</span> Random 50/50 split, persisted in
              browser localStorage
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
