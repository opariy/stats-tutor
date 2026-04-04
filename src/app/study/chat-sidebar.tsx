"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

type Conversation = {
  id: string;
  topicId: string | null;
  topicName?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

type ChatSidebarProps = {
  sessionId: string;
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  onDeleteConversation?: (conversationId: string) => void;
};

type ViewMode = "recent" | "topics";

export default function ChatSidebar({
  sessionId,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("recent");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Fetch all conversations for this user
  useEffect(() => {
    if (!sessionId) return;

    const fetchConversations = async () => {
      try {
        const res = await fetch(`/api/conversations?sessionId=${sessionId}`);
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [sessionId]);

  // Only show chats with messages
  const chatsWithMessages = conversations.filter((c) => c.messageCount > 0);

  // Filter by search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chatsWithMessages;
    const query = searchQuery.toLowerCase();
    return chatsWithMessages.filter(
      (c) =>
        c.title?.toLowerCase().includes(query) ||
        c.topicName?.toLowerCase().includes(query)
    );
  }, [chatsWithMessages, searchQuery]);

  // Group chats by time period
  const timeGroupedChats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeek = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; chats: Conversation[] }[] = [
      { label: "Today", chats: [] },
      { label: "Yesterday", chats: [] },
      { label: "This Week", chats: [] },
      { label: "Older", chats: [] },
    ];

    filteredChats.forEach((conv) => {
      const date = new Date(conv.updatedAt);
      if (date >= today) {
        groups[0].chats.push(conv);
      } else if (date >= yesterday) {
        groups[1].chats.push(conv);
      } else if (date >= thisWeek) {
        groups[2].chats.push(conv);
      } else {
        groups[3].chats.push(conv);
      }
    });

    return groups.filter((g) => g.chats.length > 0);
  }, [filteredChats]);

  // Group chats by topic
  const topicGroupedChats = useMemo(() => {
    const topicMap = new Map<string, { name: string; chats: Conversation[] }>();
    const uncategorized: Conversation[] = [];

    filteredChats.forEach((conv) => {
      if (conv.topicId && conv.topicName) {
        const existing = topicMap.get(conv.topicId);
        if (existing) {
          existing.chats.push(conv);
        } else {
          topicMap.set(conv.topicId, { name: conv.topicName, chats: [conv] });
        }
      } else {
        uncategorized.push(conv);
      }
    });

    const sorted = Array.from(topicMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.chats.length - a.chats.length);

    if (uncategorized.length > 0) {
      sorted.push({ id: "uncategorized", name: "General", chats: uncategorized });
    }

    return sorted;
  }, [filteredChats]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getChatTitle = (conv: Conversation) => {
    if (conv.title) return conv.title;
    return "Untitled chat";
  };

  const handleDelete = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);

    if (!confirm("Delete this chat? This cannot be undone.")) return;

    try {
      await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      onDeleteConversation?.(convId);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const toggleTopicExpanded = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const renderChatItem = (conv: Conversation, showTopic = false) => (
    <div
      key={conv.id}
      className={`group relative flex items-center transition-colors ${
        activeConversationId === conv.id
          ? "bg-teal-50 border-r-2 border-teal-600"
          : "hover:bg-stone-50"
      }`}
    >
      <button
        onClick={() => onSelectConversation(conv)}
        className="flex-1 text-left px-4 py-2.5 flex items-center gap-3"
      >
        <svg
          className={`w-4 h-4 flex-shrink-0 ${
            activeConversationId === conv.id ? "text-teal-600" : "text-stone-400"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-medium truncate ${
              activeConversationId === conv.id ? "text-teal-700" : "text-stone-700"
            }`}
          >
            {getChatTitle(conv)}
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>{formatTime(conv.updatedAt)}</span>
            {showTopic && conv.topicName && (
              <>
                <span>·</span>
                <span className="truncate">{conv.topicName}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Menu button */}
      <div className="relative pr-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
          }}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-stone-200 transition-opacity"
        >
          <svg className="w-4 h-4 text-stone-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {menuOpenId === conv.id && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
            <button
              onClick={(e) => handleDelete(conv.id, e)}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpenId]);

  return (
    <div className="bg-white border-r border-stone-200 w-72 flex flex-col h-full">
      {/* Logo Header */}
      <div className="p-4 border-b border-stone-200">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Krokyo"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <span className="font-display text-xl font-bold text-stone-900 tracking-tight group-hover:text-teal-700 transition-colors">
            Krokyo
          </span>
        </Link>
      </div>

      {/* New Chat Button + Search */}
      <div className="p-4 border-b border-stone-100 space-y-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-primary-gradient text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* View toggle */}
        <div className="flex bg-stone-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("recent")}
            className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-colors ${
              viewMode === "recent"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setViewMode("topics")}
            className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-colors ${
              viewMode === "topics"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            By Topic
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-stone-400 text-sm">Loading...</div>
        ) : filteredChats.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-stone-500 text-sm">
              {searchQuery ? "No matching chats" : "No chats yet"}
            </p>
            {!searchQuery && (
              <p className="text-stone-400 text-xs mt-1">Click "New Chat" to start</p>
            )}
          </div>
        ) : viewMode === "recent" ? (
          // Time-grouped view
          <div className="py-2">
            {timeGroupedChats.map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.chats.map((conv) => renderChatItem(conv, true))}
              </div>
            ))}
          </div>
        ) : (
          // Topic-grouped view
          <div className="py-2">
            {topicGroupedChats.map((group) => (
              <div key={group.id}>
                <button
                  onClick={() => toggleTopicExpanded(group.id)}
                  className="w-full px-4 py-2 flex items-center gap-2 hover:bg-stone-50 transition-colors"
                >
                  <svg
                    className={`w-3 h-3 text-stone-400 transition-transform ${
                      expandedTopics.has(group.id) ? "rotate-90" : ""
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium text-stone-700 truncate flex-1 text-left">
                    {group.name}
                  </span>
                  <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    {group.chats.length}
                  </span>
                </button>
                {expandedTopics.has(group.id) && (
                  <div className="ml-2 border-l border-stone-200">
                    {group.chats.map((conv) => renderChatItem(conv))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
