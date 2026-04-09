"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type User = {
  id: string;
  email: string;
  group: string;
  createdAt: string;
};

type Stats = {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  avgResponseTime: number;
};

type FeedbackStats = {
  total: number;
  thumbsUp: number;
  thumbsDown: number;
};

type Message = {
  id: string;
  role: string;
  content: string;
  responseTimeMs: number | null;
  createdAt: string;
};

type FeedbackItem = {
  messageId: string;
  rating: string;
  comment: string | null;
  createdAt: string;
};

type UserData = {
  user: User;
  stats: Stats;
  feedbackStats: FeedbackStats;
  messages: Message[];
  feedback: FeedbackItem[];
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch(`/api/admin/users/${params.id}`);
      if (res.ok) {
        const userData = await res.json();
        setData(userData);
      }
      setLoading(false);
    }
    fetchUser();
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone and will delete all their messages and feedback.")) {
      return;
    }

    setDeleting(true);
    const res = await fetch(`/api/admin/users/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/users");
    } else {
      alert("Failed to delete user");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-stone-200 rounded w-48 mb-4" />
            <div className="h-4 bg-stone-200 rounded w-32 mb-8" />
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="h-20 bg-stone-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight mb-4">User Not Found</h1>
          <Link href="/admin/users" className="text-teal-600 hover:text-teal-700">
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  const { user, stats, feedbackStats, messages, feedback } = data;
  const feedbackMap = new Map(feedback.map((f) => [f.messageId, f]));
  const satisfactionRate = feedbackStats.total > 0
    ? Math.round((feedbackStats.thumbsUp / feedbackStats.total) * 100)
    : null;

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="mb-6">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Users
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">User Profile</h1>
              <p className="text-stone-500 mt-1 font-mono text-sm">{user.id}</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete User"}
            </button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-6 mb-6">
          <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">User Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Email</p>
              <p className="text-sm text-stone-700">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Group</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                user.group === "krokyo"
                  ? "bg-teal-100 text-teal-700"
                  : "bg-violet-100 text-violet-700"
              }`}>
                {user.group}
              </span>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Joined</p>
              <p className="text-sm text-stone-700">{new Date(user.createdAt).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" })}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Satisfaction</p>
              <p className={`text-lg font-bold ${
                satisfactionRate !== null && satisfactionRate >= 70
                  ? "text-emerald-600"
                  : satisfactionRate !== null && satisfactionRate >= 40
                  ? "text-amber-600"
                  : "text-stone-500"
              }`}>
                {satisfactionRate !== null ? `${satisfactionRate}%` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Total Messages</p>
            <p className="text-2xl font-bold text-stone-900">{stats.totalMessages}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Questions Asked</p>
            <p className="text-2xl font-bold text-stone-900">{stats.userMessages}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Response Time</p>
            <p className="text-2xl font-bold text-stone-900">
              {stats.avgResponseTime ? `${Math.round(stats.avgResponseTime / 1000)}s` : "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-5">
            <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Feedback Given</p>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold text-lg">{feedbackStats.thumbsUp}</span>
              <span className="text-stone-300">/</span>
              <span className="text-red-500 font-bold text-lg">{feedbackStats.thumbsDown}</span>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm p-6">
          <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Message History</h2>
          {messages.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {messages.map((msg) => {
                const msgFeedback = feedbackMap.get(msg.id);
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg border ${
                      msg.role === "user" ? "bg-teal-50 border-teal-200" : "bg-stone-50 border-stone-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${
                        msg.role === "user" ? "text-teal-600" : "text-stone-500"
                      }`}>
                        {msg.role}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        {msg.responseTimeMs && msg.role === "assistant" && (
                          <span>({Math.round(msg.responseTimeMs / 1000)}s)</span>
                        )}
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{msg.content}</p>
                    {msgFeedback && (
                      <div className={`mt-2 flex items-center gap-2 text-xs ${
                        msgFeedback.rating === "up" ? "text-emerald-600" : "text-red-500"
                      }`}>
                        {msgFeedback.rating === "up" ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                        )}
                        {msgFeedback.comment && (
                          <span className="italic">"{msgFeedback.comment}"</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-stone-500 py-8">No messages yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
