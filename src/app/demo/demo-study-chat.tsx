"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import DemoSidebar from "./demo-sidebar";

type Message = {
  role: "user" | "assistant";
  content: string;
};

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

export default function DemoStudyChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load conversation messages
  const loadConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/demo/history?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setMessages([]);
    }
  };

  // Handle selecting a conversation from sidebar
  const handleSelectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    await loadConversation(conversation.id);
    setShowSidebar(false);
  };

  return (
    <div className="flex h-screen bg-stone-50">
      {/* Demo Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-2 px-4 text-sm font-medium shadow-md">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Demo Mode — Browse sample conversations (read-only)
          <Link href="/study?from=demo" className="ml-2 underline hover:no-underline">
            Try it yourself →
          </Link>
        </span>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block pt-10">
        <DemoSidebar
          activeConversationId={activeConversation?.id || null}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/20 pt-10" onClick={() => setShowSidebar(false)}>
          <div className="w-72 h-full" onClick={(e) => e.stopPropagation()}>
            <DemoSidebar
              activeConversationId={activeConversation?.id || null}
              onSelectConversation={handleSelectConversation}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col pt-10">
        {/* Header */}
        <div className="border-b border-stone-200 px-5 py-4 flex items-center justify-between bg-white shadow-soft-sm">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden p-2 -ml-2 text-stone-500 hover:bg-stone-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo.png"
                alt="Krokyo"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <div>
                <h1 className="font-display text-lg font-bold text-stone-900 tracking-tight group-hover:text-teal-700 transition-colors">Krokyo</h1>
                <p className="text-xs text-stone-500 hidden sm:block">Demo — Sample conversations</p>
              </div>
            </Link>
          </div>

          {/* Dashboard Button */}
          <Link
            href="/demo"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>

        {/* Messages or Empty State */}
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary-gradient rounded-2xl blur-sm opacity-50 scale-110" />
              <Image
                src="/logo.png"
                alt="Krokyo"
                width={64}
                height={64}
                className="relative rounded-2xl shadow-soft-md"
              />
            </div>

            <h1 className="font-display text-2xl font-bold text-stone-900 mb-2 tracking-tight">
              Welcome to the Demo
            </h1>
            <p className="text-stone-500 text-sm mb-4 text-center max-w-md">
              Browse sample tutoring conversations to see how Krokyo helps students learn statistics
            </p>

            <div className="flex flex-col gap-3 text-sm text-stone-600">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-teal-100 text-teal-700 rounded-full text-xs font-bold">1</span>
                <span>Select a conversation from the sidebar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-teal-100 text-teal-700 rounded-full text-xs font-bold">2</span>
                <span>Browse the student-tutor exchange</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-teal-100 text-teal-700 rounded-full text-xs font-bold">3</span>
                <span>See how Socratic questioning guides learning</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            <div className="px-5 py-3 bg-stone-50 border-b border-stone-100">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-stone-500">Topic:</span>
                <span className="font-medium text-stone-700">{activeConversation.topicName || "General"}</span>
                <span className="text-stone-300">•</span>
                <span className="text-stone-500">{activeConversation.messageCount} messages</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 bg-gradient-to-b from-stone-50 to-white">
              {messages.map((msg, i) => (
                <div key={i} className={`mb-6 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-start gap-3 max-w-[70%]">
                      <div className="relative flex-shrink-0 mt-0.5">
                        <div className="absolute inset-0 bg-primary-gradient rounded-lg scale-110 opacity-80" />
                        <Image
                          src="/logo.png"
                          alt="Krokyo"
                          width={32}
                          height={32}
                          className="relative rounded-lg"
                        />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-md px-5 py-3 text-sm text-stone-800 border border-stone-200 shadow-soft-sm">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-3">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-3">{children}</ol>,
                            code: ({ children }) => (
                              <code className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded text-sm font-mono border border-teal-100">
                                {children}
                              </code>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {msg.role === "user" && (
                    <div className="bg-primary-gradient text-white rounded-2xl rounded-tr-md px-5 py-3 max-w-[70%] text-sm shadow-soft-md">
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Disabled Input (Demo mode) */}
            <div className="border-t border-stone-200 p-5 bg-stone-100">
              <div className="flex gap-3 max-w-2xl mx-auto">
                <div className="flex-1 border border-stone-200 rounded-full px-5 py-3 text-stone-400 bg-stone-50 text-sm cursor-not-allowed">
                  Demo mode — messages are read-only
                </div>
                <Link
                  href="/study?from=demo"
                  className="bg-primary-gradient text-white px-5 py-3 rounded-full text-sm font-medium hover:shadow-lg transition-all whitespace-nowrap"
                >
                  Try it yourself
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
