"use client";

import { useState, useEffect } from "react";
import { chapters, type Topic } from "@/lib/topics";

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
  onNewChat: (topicId: string | null) => void;
};

export default function ChatSidebar({
  sessionId,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
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

  // Group conversations by topicId - only show chats with messages
  const chatsWithMessages = conversations.filter((c) => c.messageCount > 0);
  const generalChats = chatsWithMessages.filter((c) => !c.topicId);
  const chatsByTopic = chatsWithMessages.reduce((acc, conv) => {
    if (conv.topicId) {
      if (!acc[conv.topicId]) acc[conv.topicId] = [];
      acc[conv.topicId].push(conv);
    }
    return acc;
  }, {} as Record<string, Conversation[]>);

  // Get topic info from chapters
  const getTopicInfo = (topicId: string): Topic | undefined => {
    for (const chapter of chapters) {
      const topic = chapter.topics.find((t) => t.id === topicId);
      if (topic) return topic;
    }
    return undefined;
  };

  const toggleTopic = (topicId: string) => {
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
    if (conv.messageCount === 0) return "New chat";
    return "Untitled chat";
  };

  // Get topics that have chats
  const topicsWithChats = Object.keys(chatsByTopic);

  return (
    <div className="bg-white border-r border-stone-200 w-72 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-stone-100">
        <button
          onClick={() => onNewChat(null)}
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
          <div className="p-4 text-center text-stone-400 text-sm">
            No chats yet. Start a new conversation!
          </div>
        ) : (
          <>
            {/* General Chats */}
            {generalChats.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  General
                </div>
                {generalChats.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                      activeConversationId === conv.id
                        ? "bg-teal-50 text-teal-700"
                        : "hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Topic Folders */}
            {topicsWithChats.length > 0 && (
              <div className="py-2 border-t border-stone-100">
                <div className="px-4 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Topics
                </div>
                {topicsWithChats.map((topicId) => {
                  const topicInfo = getTopicInfo(topicId);
                  const topicChats = chatsByTopic[topicId];
                  const isExpanded = expandedTopics.has(topicId);

                  return (
                    <div key={topicId}>
                      {/* Topic Header */}
                      <button
                        onClick={() => toggleTopic(topicId)}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-stone-50 transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 text-stone-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-stone-700 truncate">
                            {topicInfo?.name || topicId}
                          </div>
                          <div className="text-xs text-stone-400">{topicChats.length} chat{topicChats.length !== 1 ? "s" : ""}</div>
                        </div>
                      </button>

                      {/* Chats in Topic */}
                      {isExpanded && (
                        <div className="ml-6 border-l border-stone-100">
                          {topicChats.map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => onSelectConversation(conv)}
                              className={`w-full text-left px-4 py-2 flex items-center gap-2 transition-colors ${
                                activeConversationId === conv.id
                                  ? "bg-teal-50 text-teal-700"
                                  : "hover:bg-stone-50 text-stone-600"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate">{getChatTitle(conv)}</div>
                                <div className="text-xs text-stone-400">{formatDate(conv.updatedAt)}</div>
                              </div>
                            </button>
                          ))}
                          {/* Add chat to topic */}
                          <button
                            onClick={() => onNewChat(topicId)}
                            className="w-full text-left px-4 py-2 flex items-center gap-2 text-stone-400 hover:text-teal-600 hover:bg-stone-50 transition-colors text-sm"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New chat in topic
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Browse Topics (to create new chats in topics) */}
            <div className="py-2 border-t border-stone-100">
              <div className="px-4 py-1 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Browse Topics
              </div>
              {chapters.map((chapter) => (
                <div key={chapter.number}>
                  <button
                    onClick={() => toggleTopic(`chapter-${chapter.number}`)}
                    className="w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-stone-50 transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 text-stone-400 transition-transform ${
                        expandedTopics.has(`chapter-${chapter.number}`) ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="w-5 h-5 rounded bg-stone-100 text-stone-500 text-xs font-medium flex items-center justify-center">
                      {chapter.number}
                    </span>
                    <span className="text-sm text-stone-600">{chapter.title}</span>
                  </button>
                  {expandedTopics.has(`chapter-${chapter.number}`) && (
                    <div className="ml-10">
                      {chapter.topics.map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => onNewChat(topic.id)}
                          className="w-full text-left px-3 py-1.5 text-sm text-stone-500 hover:text-teal-600 hover:bg-stone-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {topic.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
