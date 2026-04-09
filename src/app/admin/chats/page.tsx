import { db } from "@/lib/db";
import { users, messages, conversations, feedback, topics } from "@/lib/db/schema";
import { eq, sql, desc, isNull, and, not } from "drizzle-orm";
import Link from "next/link";

type ChatData = {
  id: string;
  title: string;
  topicId: string | null;
  topicName: string | null;
  userId: string;
  userEmail: string;
  userGroup: string;
  messageCount: number;
  userMessageCount: number;
  thumbsUp: number;
  thumbsDown: number;
  createdAt: Date;
  lastMessageAt: Date | null;
  isDemo: boolean;
};

async function getChats(): Promise<ChatData[]> {
  const chats = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      topicId: conversations.topicId,
      topicName: topics.name,
      userId: conversations.userId,
      userEmail: users.email,
      userGroup: users.group,
      messageCount: sql<number>`count(distinct ${messages.id})`,
      userMessageCount: sql<number>`count(distinct ${messages.id}) filter (where ${messages.role} = 'user')`,
      thumbsUp: sql<number>`count(*) filter (where ${feedback.rating} = 'up')`,
      thumbsDown: sql<number>`count(*) filter (where ${feedback.rating} = 'down')`,
      createdAt: conversations.createdAt,
      lastMessageAt: sql<Date>`max(${messages.createdAt})`,
      isDemo: conversations.isDemo,
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .leftJoin(feedback, eq(feedback.messageId, messages.id))
    .leftJoin(topics, eq(conversations.topicId, topics.id))
    .where(and(
      not(conversations.isDemo),
      sql`${conversations.title} != ''`
    ))
    .groupBy(
      conversations.id,
      conversations.title,
      conversations.topicId,
      topics.name,
      conversations.userId,
      users.email,
      users.group,
      conversations.createdAt,
      conversations.isDemo
    )
    .orderBy(desc(sql`max(${messages.createdAt})`))
    .limit(100);

  return chats as ChatData[];
}

function formatDateTime(date: Date | null) {
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

function TopicBadge({ topicName }: { topicName: string | null }) {
  if (!topicName) {
    return <span className="text-stone-400 text-sm">General</span>;
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 truncate max-w-[150px]">
      {topicName}
    </span>
  );
}

export default async function ChatsPage() {
  const chats = await getChats();

  // Calculate summary stats
  const totalChats = chats.length;
  const uniqueUsers = new Set(chats.map(c => c.userId)).size;
  const totalMessages = chats.reduce((sum, c) => sum + Number(c.messageCount), 0);
  const avgMessagesPerChat = totalChats > 0 ? totalMessages / totalChats : 0;

  return (
    <div className="p-8">
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Chats</h1>
          <p className="text-stone-500 mt-1">Browse conversation threads by topic</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Total Chats</p>
            <p className="text-2xl font-bold text-stone-900">{totalChats}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Unique Users</p>
            <p className="text-2xl font-bold text-stone-900">{uniqueUsers}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Total Messages</p>
            <p className="text-2xl font-bold text-stone-900">{totalMessages}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Msgs/Chat</p>
            <p className="text-2xl font-bold text-stone-900">{avgMessagesPerChat.toFixed(1)}</p>
          </div>
        </div>

        {/* Chats Table */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm overflow-hidden">
          {chats.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Title</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Topic</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">User</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Group</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Messages</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Last Active</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Satisfaction</th>
                  <th className="text-left py-4 px-6 text-xs text-stone-500 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chats.map((chat) => (
                  <tr key={chat.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-stone-900 truncate max-w-[200px]" title={chat.title}>
                        {chat.title || "Untitled"}
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <TopicBadge topicName={chat.topicName} />
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-mono text-xs text-stone-600">{chat.userId.slice(0, 8)}...</p>
                        <p className="text-xs text-stone-400 truncate max-w-[120px]">{chat.userEmail}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        chat.userGroup === "krokyo"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-violet-100 text-violet-700"
                      }`}>
                        {chat.userGroup}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-stone-900">{chat.messageCount}</span>
                      <span className="text-stone-400 text-sm ml-1">({chat.userMessageCount} Q)</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-stone-500">
                      {formatDateTime(chat.lastMessageAt)}
                    </td>
                    <td className="py-4 px-6">
                      <SatisfactionBadge thumbsUp={chat.thumbsUp} thumbsDown={chat.thumbsDown} />
                    </td>
                    <td className="py-4 px-6">
                      <Link
                        href={`/admin/chats/${chat.id}`}
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

        <p className="text-xs text-stone-400 mt-4 text-center">
          Showing most recent 100 conversations (excluding demos and untitled)
        </p>
      </div>
    </div>
  );
}
