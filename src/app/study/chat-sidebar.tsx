"use client";

import { useState, useEffect } from "react";

type Conversation = {
  id: string;
  topicId: string | null;
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
};

export default function ChatSidebar({
  sessionId,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getChatTitle = (conv: Conversation) => {
    if (conv.title) return conv.title;
    return "Untitled chat";
  };

  return (
    <div className="bg-white border-r border-stone-200 w-72 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-stone-100">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-primary-gradient text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-stone-400 text-sm">Loading...</div>
        ) : chatsWithMessages.length === 0 ? (
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
            <p className="text-stone-500 text-sm">No chats yet</p>
            <p className="text-stone-400 text-xs mt-1">Click "New Chat" to start</p>
          </div>
        ) : (
          <div className="py-2">
            {chatsWithMessages.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  activeConversationId === conv.id
                    ? "bg-teal-50 text-teal-700 border-r-2 border-teal-600"
                    : "hover:bg-stone-50 text-stone-700"
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{getChatTitle(conv)}</div>
                  <div className="text-xs text-stone-400">{formatDate(conv.updatedAt)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
