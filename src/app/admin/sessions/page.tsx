import { db } from "@/lib/db";
import { users, messages, topics } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";
import Link from "next/link";

type SessionData = {
  session_id: string;
  ordinal: number;
  user_id: string;
  user_email: string;
  user_group: string;
  start_time: Date;
  end_time: Date;
  duration_minutes: number;
  message_count: number;
  user_message_count: number;
};

async function getSessions(): Promise<SessionData[]> {
  // Query sessions using 30-min gap logic
  const result = await db.execute(sql`
    WITH message_gaps AS (
      SELECT
        m.user_id,
        m.created_at,
        m.role,
        EXTRACT(EPOCH FROM (m.created_at - LAG(m.created_at) OVER (PARTITION BY m.user_id ORDER BY m.created_at))) / 60 as gap_minutes
      FROM messages m
    ),
    session_boundaries AS (
      SELECT
        user_id,
        created_at,
        role,
        CASE WHEN gap_minutes IS NULL OR gap_minutes > 30 THEN 1 ELSE 0 END as is_new_session
      FROM message_gaps
    ),
    sessions AS (
      SELECT
        user_id,
        created_at,
        role,
        SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY created_at) as session_num
      FROM session_boundaries
    ),
    session_stats AS (
      SELECT
        user_id,
        session_num,
        MIN(created_at) as start_time,
        MAX(created_at) as end_time,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 60 as duration_minutes,
        COUNT(*) as message_count,
        COUNT(*) FILTER (WHERE role = 'user') as user_message_count
      FROM sessions
      GROUP BY user_id, session_num
    )
    SELECT
      ss.user_id || '-' || ss.session_num as session_id,
      ss.session_num as ordinal,
      ss.user_id,
      u.email as user_email,
      u."group" as user_group,
      ss.start_time,
      ss.end_time,
      ROUND(ss.duration_minutes::numeric, 1) as duration_minutes,
      ss.message_count,
      ss.user_message_count
    FROM session_stats ss
    JOIN users u ON ss.user_id = u.id
    ORDER BY ss.start_time DESC
    LIMIT 100
  `);

  return result.rows as SessionData[];
}

function formatDateTime(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatDuration(minutes: number) {
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

function DurationBadge({ minutes }: { minutes: number }) {
  const color = minutes > 15 ? "bg-emerald-100 text-emerald-700" :
                minutes > 5 ? "bg-amber-100 text-amber-700" :
                "bg-stone-100 text-stone-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {formatDuration(minutes)}
    </span>
  );
}

export default async function SessionsPage() {
  const sessions = await getSessions();

  // Calculate summary stats
  const totalSessions = sessions.length;
  const avgDuration = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + Number(s.duration_minutes), 0) / sessions.length
    : 0;
  const avgMessages = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + Number(s.message_count), 0) / sessions.length
    : 0;
  const uniqueUsers = new Set(sessions.map(s => s.user_id)).size;

  return (
    <div className="p-8">
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Sessions</h1>
          <p className="text-stone-500 mt-1">User engagement sessions (30-minute gap detection)</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Total Sessions</p>
            <p className="text-2xl font-bold text-stone-900">{totalSessions}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Unique Users</p>
            <p className="text-2xl font-bold text-stone-900">{uniqueUsers}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Duration</p>
            <p className="text-2xl font-bold text-stone-900">{formatDuration(avgDuration)}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Messages</p>
            <p className="text-2xl font-bold text-stone-900">{avgMessages.toFixed(1)}</p>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm overflow-hidden">
          {sessions.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">User</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Group</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Session #</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Started</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Duration</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Messages</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Questions</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.session_id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-mono text-xs text-stone-600">{session.user_id.slice(0, 8)}...</p>
                        <p className="text-sm text-stone-500 truncate max-w-[180px]">{session.user_email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        session.user_group === "krokyo"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-violet-100 text-violet-700"
                      }`}>
                        {session.user_group}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-medium text-stone-700">#{session.ordinal}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-stone-500">
                      {formatDateTime(session.start_time)}
                    </td>
                    <td className="py-4 px-6">
                      <DurationBadge minutes={Number(session.duration_minutes)} />
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-stone-900">{session.message_count}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-stone-600">{session.user_message_count}</span>
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        href={`/admin/conversations/${session.user_id}`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        View User
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-stone-500">
              No sessions yet
            </div>
          )}
        </div>

        <p className="text-xs text-stone-400 mt-4 text-center">
          Showing most recent 100 sessions. A new session starts after 30+ minutes of inactivity.
        </p>
      </div>
    </div>
  );
}
