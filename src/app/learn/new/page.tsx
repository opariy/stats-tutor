"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { GeneratedCurriculum } from "@/lib/curriculum-generator";

type Step = "chat" | "generating" | "creating";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function NewLearnPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input after AI responds
  useEffect(() => {
    if (!isLoading && messages.length > 0 && step === "chat") {
      inputRef.current?.focus();
    }
  }, [isLoading, messages.length, step]);

  const handleSend = async (directPrompt?: string) => {
    const messageContent = directPrompt?.trim() || input.trim();
    if (!messageContent || isLoading) return;

    const userMessage: Message = { role: "user", content: messageContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/learn/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let assistantContent = "";
      let hasStartedAssistant = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "text") {
              assistantContent += data.content;

              if (!hasStartedAssistant) {
                hasStartedAssistant = true;
                setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                  return updated;
                });
              }
            } else if (data.type === "status" && data.status === "generating_curriculum") {
              setStep("generating");
            } else if (data.type === "curriculum") {
              // Auto-create course immediately
              createCourse(data.curriculum, newMessages);
            } else if (data.type === "error") {
              setError(data.error);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const createCourse = async (curriculumData: GeneratedCurriculum, currentMessages: Message[]) => {
    setStep("creating");
    setError(null);

    try {
      // Get or create session ID
      let sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        sessionId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("sessionId", sessionId);
      }

      // Build description from conversation
      const userMessages = currentMessages.filter((m) => m.role === "user").map((m) => m.content);
      const description = userMessages.join(". ");

      const response = await fetch("/api/learn/create-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: curriculumData.courseName,
          subjectDescription: description,
          curriculum: curriculumData,
          sessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create course");
      }

      const data = await response.json();
      router.push(data.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("chat");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/" className="inline-flex items-center gap-3 group">
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
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Chat Step */}
        {(step === "chat" || step === "generating" || step === "creating") && (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-soft-md overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px', maxHeight: '700px' }}>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-stone-100 flex-shrink-0">
              <h1 className="font-display text-xl font-bold text-stone-900 tracking-tight">
                What do you want to learn?
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                Tell me what you&apos;re interested in and I&apos;ll create a personalized curriculum
              </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-stone-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-primary-gradient rounded-xl blur-sm opacity-50 scale-110" />
                    <Image
                      src="/logo.png"
                      alt="Krokyo"
                      width={48}
                      height={48}
                      className="relative rounded-xl"
                    />
                  </div>
                  <p className="text-stone-500 text-sm mb-6 max-w-xs">
                    Type anything - even just a word like &quot;python&quot; or &quot;economics&quot; - and I&apos;ll help you get started
                  </p>

                  {/* Example starters */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["Python", "Calculus", "Economics", "Statistics"].map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleSend(topic)}
                        className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-600 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700 transition-colors"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && msg.content && (
                        <div className="flex items-start gap-2 max-w-[85%]">
                          <div className="flex-shrink-0 mt-0.5">
                            <Image
                              src="/logo.png"
                              alt="Krokyo"
                              width={28}
                              height={28}
                              className="rounded-lg"
                            />
                          </div>
                          <div className="bg-white rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-stone-800 border border-stone-200 shadow-soft-sm">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {msg.role === "user" && (
                        <div className="bg-primary-gradient text-white rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[85%] text-sm shadow-soft-md">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (messages[messages.length - 1]?.role !== "assistant" || !messages[messages.length - 1]?.content) && (
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        <Image
                          src="/logo.png"
                          alt="Krokyo"
                          width={28}
                          height={28}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-stone-500 border border-stone-200 shadow-soft-sm">
                        <span className="animate-pulse">Thinking</span>
                      </div>
                    </div>
                  )}

                  {/* Quick reply buttons for experience level (show after first AI response) */}
                  {!isLoading && messages.length === 2 && messages[messages.length - 1]?.role === "assistant" && (
                    <div className="flex flex-wrap gap-2 ml-9 mt-2">
                      {[
                        { label: "Complete beginner", value: "I'm a complete beginner" },
                        { label: "Some experience", value: "I have some experience" },
                        { label: "Intermediate", value: "Intermediate level" },
                        { label: "Advanced", value: "Advanced, looking for depth" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSend(option.value)}
                          className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-600 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-700 transition-colors"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Generating curriculum / Creating course indicator */}
                  {(step === "generating" || step === "creating") && (
                    <div className="flex items-start gap-2 mt-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <Image
                          src="/logo.png"
                          alt="Krokyo"
                          width={28}
                          height={28}
                          className="rounded-lg"
                        />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 border border-stone-200 shadow-soft-sm max-w-[85%]">
                        <div className="flex items-center gap-3 mb-2">
                          <svg
                            className="animate-spin w-4 h-4 text-teal-600"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span className="text-sm font-medium text-stone-800">
                            {step === "generating" ? "Generating your curriculum" : "Creating your course"}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          {step === "generating"
                            ? "Creating chapters, topics, and practice questions tailored to your level"
                            : "Setting up your personalized learning experience"
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="px-6 py-4 border-t border-stone-100 bg-white flex-shrink-0">
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type what you want to learn..."
                  className="flex-1 border border-stone-200 rounded-full px-5 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 text-sm bg-stone-50 transition-all"
                  disabled={isLoading || step === "generating"}
                  autoFocus
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim() || step === "generating"}
                  className="bg-primary-gradient disabled:opacity-40 text-white p-3 rounded-full transition-all hover:shadow-lg disabled:hover:shadow-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
