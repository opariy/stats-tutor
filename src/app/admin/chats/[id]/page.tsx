import { db } from "@/lib/db";
import { users, messages, conversations, feedback, topics } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

type MessageWithFeedback = {
  id: string;
  role: string;
  content: string;
  responseTimeMs: number | null;
  createdAt: Date;
  feedback: { rating: string; comment: string | null } | null;
};

async function getChat(id: string) {
  const [conversation] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      topicId: conversations.topicId,
      topicName: topics.name,
      userId: conversations.userId,
      userEmail: users.email,
      userGroup: users.group,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .leftJoin(topics, eq(conversations.topicId, topics.id))
    .where(eq(conversations.id, id));

  if (!conversation) return null;

  const chatMessages = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      responseTimeMs: messages.responseTimeMs,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const chatFeedback = await db
    .select({
      messageId: feedback.messageId,
      rating: feedback.rating,
      comment: feedback.comment,
    })
    .from(feedback)
    .innerJoin(messages, eq(feedback.messageId, messages.id))
    .where(eq(messages.conversationId, id));

  const feedbackMap = new Map(
    chatFeedback.map((f) => [f.messageId, { rating: f.rating, comment: f.comment }])
  );

  const messagesWithFeedback: MessageWithFeedback[] = chatMessages.map((msg) => ({
    ...msg,
    feedback: feedbackMap.get(msg.id) || null,
  }));

  return { conversation, messages: messagesWithFeedback };
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

function MessageBubble({ message }: { message: MessageWithFeedback }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] ${isUser ? "order-2" : "order-1"}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-primary-gradient text-white rounded-br-md"
              : "bg-white border border-stone-200 text-stone-900 rounded-bl-md"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className={`flex items-center gap-2 mt-1 text-xs text-stone-400 ${isUser ? "justify-end" : "justify-start"}`}>
          <span>{formatTime(message.createdAt)}</span>
          {message.responseTimeMs && !isUser && (
            <span className="text-stone-300">({Math.round(message.responseTimeMs / 1000)}s)</span>
          )}
          {message.feedback && (
            <span className={`flex items-center gap-1 ${
              message.feedback.rating === "up" ? "text-emerald-500" : "text-red-500"
            }`}>
              {message.feedback.rating === "up" ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              )}
            </span>
          )}
        </div>
        {message.feedback?.comment && (
          <p className={`text-xs text-stone-500 mt-1 italic ${isUser ? "text-right" : "text-left"}`}>
            &quot;{message.feedback.comment}&quot;
          </p>
        )}
      </div>
    </div>
  );
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getChat(id);

  if (!data) {
    notFound();
  }

  const { conversation, messages: chatMessages } = data;

  // Group messages by date
  const messagesByDate = chatMessages.reduce((acc, msg) => {
    const dateKey = formatDate(msg.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {} as Record<string, MessageWithFeedback[]>);

  const thumbsUp = chatMessages.filter((m) => m.feedback?.rating === "up").length;
  const thumbsDown = chatMessages.filter((m) => m.feedback?.rating === "down").length;
  const userQuestions = chatMessages.filter((m) => m.role === "user").length;

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="mb-6">
          <Link
            href="/admin/chats"
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Chats
          </Link>
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">
            {conversation.title || "Untitled Chat"}
          </h1>
          {conversation.topicName && (
            <p className="text-stone-500 mt-1">
              Topic: <span className="font-medium text-blue-600">{conversation.topicName}</span>
            </p>
          )}
        </div>

        {/* Conversation Info Card */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-6 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">User</p>
              <p className="font-mono text-sm text-stone-700">{conversation.userId.slice(0, 8)}...</p>
              <p className="text-xs text-stone-400">{conversation.userEmail}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Group</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                conversation.userGroup === "krokyo"
                  ? "bg-teal-100 text-teal-700"
                  : "bg-violet-100 text-violet-700"
              }`}>
                {conversation.userGroup}
              </span>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Messages</p>
              <p className="text-sm font-semibold text-stone-900">{chatMessages.length}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Questions</p>
              <p className="text-sm font-semibold text-stone-900">{userQuestions}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Feedback</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-emerald-600 font-medium">{thumbsUp}</span>
                <span className="text-red-500 font-medium">{thumbsDown}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Started</p>
              <p className="text-sm text-stone-700">{new Date(conversation.createdAt).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-stone-100 rounded-xl p-6">
          {chatMessages.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(messagesByDate).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center justify-center mb-4">
                    <span className="bg-stone-200 text-stone-600 text-xs font-medium px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {msgs.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-stone-500 py-8">No messages in this conversation</p>
          )}
        </div>
      </div>
    </div>
  );
}
