import { db } from "@/lib/db";
import { users, messages, feedback } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import Link from "next/link";

type Conversation = {
  id: string;
  email: string;
  group: string;
  createdAt: Date;
  messageCount: number;
  lastMessageAt: Date | null;
  thumbsUp: number;
  thumbsDown: number;
};

async function getConversations(): Promise<Conversation[]> {
  const conversations = await db
    .select({
      id: users.id,
      email: users.email,
      group: users.group,
      createdAt: users.createdAt,
      messageCount: sql<number>`count(distinct ${messages.id})`,
      lastMessageAt: sql<Date>`max(${messages.createdAt})`,
      thumbsUp: sql<number>`count(*) filter (where ${feedback.rating} = 'up')`,
      thumbsDown: sql<number>`count(*) filter (where ${feedback.rating} = 'down')`,
    })
    .from(users)
    .leftJoin(messages, eq(messages.userId, users.id))
    .leftJoin(feedback, eq(feedback.userId, users.id))
    .groupBy(users.id, users.email, users.group, users.createdAt)
    .orderBy(desc(sql`max(${messages.createdAt})`));

  return conversations;
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function SatisfactionBadge({ thumbsUp, thumbsDown }: { thumbsUp: number; thumbsDown: number }) {
  const total = thumbsUp + thumbsDown;
  if (total === 0) return <span className="text-stone-400">—</span>;

  const rate = Math.round((thumbsUp / total) * 100);
  const color = rate >= 70 ? "text-emerald-600" : rate >= 40 ? "text-amber-600" : "text-red-500";

  return (
    <span className={`font-semibold ${color}`}>
      {rate}%
    </span>
  );
}

export default async function ConversationsPage() {
  const conversations = await getConversations();

  return (
    <div className="p-8">
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Conversations</h1>
          <p className="text-stone-500 mt-1">Browse all user conversations and message history</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm overflow-hidden">
          {conversations.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">User</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Group</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Messages</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Last Active</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Satisfaction</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => (
                  <tr key={conv.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-mono text-xs text-stone-600">{conv.id.slice(0, 8)}...</p>
                        <p className="text-sm text-stone-500 truncate max-w-[200px]">{conv.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        conv.group === "krokyo"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-violet-100 text-violet-700"
                      }`}>
                        {conv.group}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-stone-900">{conv.messageCount}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-stone-500">
                      {formatDate(conv.lastMessageAt)}
                    </td>
                    <td className="py-4 px-6">
                      <SatisfactionBadge thumbsUp={conv.thumbsUp} thumbsDown={conv.thumbsDown} />
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        href={`/admin/conversations/${conv.id}`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-stone-500">
              No conversations yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
