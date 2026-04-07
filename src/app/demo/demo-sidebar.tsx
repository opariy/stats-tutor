"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

type Conversation = {
  id: string;
  topicId: string | null;
  topicName?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  userName?: string;
  userGroup?: "krokyo" | "control";
};

type DemoSidebarProps = {
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
};

export default function DemoSidebar({
  activeConversationId,
  onSelectConversation,
}: DemoSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Load demo conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await fetch("/api/demo/conversations");
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch (error) {
        console.error("Failed to load demo conversations:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConversations();
  }, []);

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) => {
    return searchQuery === "" ||
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.topicName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-72 h-full bg-white border-r border-stone-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-stone-200">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="Krokyo"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <div>
              <h1 className="font-display font-bold text-stone-900 group-hover:text-teal-700 transition-colors">
                Demo
              </h1>
              <p className="text-xs text-stone-500">Sample conversations</p>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-5 h-5 animate-spin text-stone-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-sm">
            {searchQuery ? "No matching conversations" : "No demo conversations yet"}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  activeConversationId === conv.id
                    ? "bg-teal-50 border border-teal-200"
                    : "hover:bg-stone-50 border border-transparent"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">
                    {conv.title || "Untitled"}
                  </p>
                  <p className="text-xs text-stone-500 truncate mt-0.5">
                    {conv.topicName || "General"}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-stone-400">
                  <span>{conv.messageCount} msgs</span>
                  <span>•</span>
                  <span>{conv.userName?.split("@")[0]}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
