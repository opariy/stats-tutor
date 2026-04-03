"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import TopicPicker from "./topic-picker";
import { type Topic } from "@/lib/topics";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  const stored = localStorage.getItem("stats-tutor-session");
  if (stored) return stored;

  const sessionId = crypto.randomUUID();
  localStorage.setItem("stats-tutor-session", sessionId);
  return sessionId;
}

function getOrAssignGroup(): "krokyo" | "control" {
  if (typeof window === "undefined") return "krokyo";

  const stored = localStorage.getItem("stats-tutor-group");
  if (stored === "krokyo" || stored === "control") {
    return stored;
  }

  const group = Math.random() < 0.5 ? "krokyo" : "control";
  localStorage.setItem("stats-tutor-group", group);
  return group;
}

export default function StudyChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [group, setGroup] = useState<"krokyo" | "control">("krokyo");
  const [sessionId, setSessionId] = useState("");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, "up" | "down">>({});
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setGroup(getOrAssignGroup());
    setSessionId(sid);

    fetch(`/api/history?sessionId=${sid}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingHistory(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFeedback = async (assistantIndex: number, rating: "up" | "down") => {
    if (feedbackGiven[assistantIndex]) return;

    setFeedbackGiven((prev) => ({ ...prev, [assistantIndex]: rating }));

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messageIndex: assistantIndex, rating }),
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    const topicContext = selectedTopic
      ? `[Topic: ${selectedTopic.name} - ${selectedTopic.description}]\n\n`
      : "";

    const userMessage: Message = { role: "user", content: messageContent };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          group,
          sessionId,
          topicContext: selectedTopic ? topicContext : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let fullContent = "";
      let hasStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        if (!hasStarted) {
          hasStarted = true;
          setMessages([...newMessages, { role: "assistant", content: fullContent }]);
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: fullContent,
            };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssistantIndex = (messageIndex: number) => {
    let count = 0;
    for (let i = 0; i <= messageIndex; i++) {
      if (messages[i]?.role === "assistant") count++;
    }
    return count - 1;
  };

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-screen bg-stone-50 items-center justify-center">
        <div className="w-12 h-12 bg-primary-gradient rounded-xl flex items-center justify-center animate-pulse shadow-soft-md">
          <span className="text-xl">📊</span>
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0 || isLoading;

  if (!hasMessages) {
    return (
      <div className="flex h-screen bg-stone-50">
        {/* Topic Picker Sidebar */}
        <div className="hidden md:block">
          <TopicPicker onSelectTopic={setSelectedTopic} selectedTopic={selectedTopic} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Topic Toggle */}
          <div className="md:hidden border-b border-stone-200 p-4 bg-white">
            <button
              onClick={() => setShowTopicPicker(!showTopicPicker)}
              className="flex items-center gap-2 text-sm text-stone-600 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {selectedTopic ? `Topic: ${selectedTopic.name}` : "Browse Topics"}
            </button>
          </div>

          {/* Mobile Topic Picker */}
          {showTopicPicker && (
            <div className="md:hidden absolute inset-0 z-50 bg-white">
              <div className="flex items-center justify-between p-4 border-b border-stone-200">
                <h2 className="font-display font-semibold text-stone-900">Select Topic</h2>
                <button onClick={() => setShowTopicPicker(false)} className="text-stone-500 p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <TopicPicker
                onSelectTopic={(topic) => {
                  setSelectedTopic(topic);
                  setShowTopicPicker(false);
                }}
                selectedTopic={selectedTopic}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {/* Avatar with gradient ring */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-primary-gradient rounded-2xl blur-sm opacity-50 scale-110" />
              <div className="relative w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-soft-md">
                <span className="text-3xl">📊</span>
              </div>
            </div>

            <h1 className="font-display text-2xl font-bold text-stone-900 mb-2 tracking-tight">
              Krokyo Tutor
            </h1>
            <p className="text-stone-500 text-sm mb-3">Chapters 1-10</p>

            {selectedTopic && (
              <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-teal-100">
                Focused on: {selectedTopic.name}
              </div>
            )}

            <div className="w-full max-w-lg">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={selectedTopic ? `Ask about ${selectedTopic.name}...` : "Ask a question..."}
                  className="flex-1 border border-stone-200 rounded-full px-5 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 text-sm bg-white shadow-soft-sm transition-all"
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-primary-gradient disabled:opacity-40 text-white p-3 rounded-full transition-all hover:shadow-lg disabled:hover:shadow-none"
                  style={{ boxShadow: input.trim() ? '0 4px 14px rgba(15, 118, 110, 0.3)' : undefined }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick suggestions */}
            <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg">
              <button
                onClick={() => setInput("What's the difference between Type I and Type II errors?")}
                className="text-xs bg-stone-100 hover:bg-teal-50 hover:text-teal-700 text-stone-600 px-4 py-2 rounded-full transition-colors font-medium"
              >
                Type I vs Type II errors
              </button>
              <button
                onClick={() => setInput("How do I know when to use a t-test vs z-test?")}
                className="text-xs bg-stone-100 hover:bg-teal-50 hover:text-teal-700 text-stone-600 px-4 py-2 rounded-full transition-colors font-medium"
              >
                t-test vs z-test
              </button>
              <button
                onClick={() => setInput("Explain confidence intervals")}
                className="text-xs bg-stone-100 hover:bg-teal-50 hover:text-teal-700 text-stone-600 px-4 py-2 rounded-full transition-colors font-medium"
              >
                Confidence intervals
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-stone-50">
      {/* Topic Picker Sidebar */}
      <div className="hidden md:block">
        <TopicPicker onSelectTopic={setSelectedTopic} selectedTopic={selectedTopic} />
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-stone-200 px-5 py-4 flex items-center justify-between bg-white shadow-soft-sm">
          <div className="flex items-center gap-4">
            {/* Avatar with gradient ring */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary-gradient rounded-xl scale-110 opacity-80" />
              <div className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
            </div>
            <div>
              <h1 className="font-display text-sm font-semibold text-stone-900">Krokyo Tutor</h1>
              <p className="text-xs text-stone-500">
                {selectedTopic ? selectedTopic.name : "Chapters 1-10"}
              </p>
            </div>
          </div>

          {/* Mobile topic toggle */}
          <button
            onClick={() => setShowTopicPicker(!showTopicPicker)}
            className="md:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Topic Picker Overlay */}
        {showTopicPicker && (
          <div className="md:hidden absolute inset-0 z-50 bg-white">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="font-display font-semibold text-stone-900">Select Topic</h2>
              <button onClick={() => setShowTopicPicker(false)} className="text-stone-500 p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TopicPicker
              onSelectTopic={(topic) => {
                setSelectedTopic(topic);
                setShowTopicPicker(false);
              }}
              selectedTopic={selectedTopic}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-6 bg-gradient-to-b from-stone-50 to-white">
          {messages.map((msg, i) => {
            const assistantIdx = msg.role === "assistant" ? getAssistantIndex(i) : -1;
            const feedback = assistantIdx >= 0 ? feedbackGiven[assistantIdx] : undefined;

            return (
              <div key={i} className={`mb-6 ${msg.role === "user" ? "text-right" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <div className="absolute inset-0 bg-primary-gradient rounded-lg scale-110 opacity-80" />
                      <div className="relative w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <span className="text-sm">📊</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="bg-white rounded-2xl rounded-tl-md px-5 py-3 max-w-[85%] text-sm text-stone-800 border border-stone-200 shadow-soft-sm">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-3">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-3">{children}</ol>,
                            code: ({ children }) => (
                              <code className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded text-sm font-mono border border-teal-100">{children}</code>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {/* Feedback buttons */}
                      <div className="flex gap-1 ml-1">
                        <button
                          onClick={() => handleFeedback(assistantIdx, "up")}
                          disabled={!!feedback}
                          className={`p-1.5 rounded-lg transition-all ${
                            feedback === "up"
                              ? "text-teal-600 bg-teal-50"
                              : feedback
                              ? "text-stone-300"
                              : "text-stone-400 hover:text-teal-600 hover:bg-teal-50"
                          }`}
                          title="Helpful"
                        >
                          <svg className="w-4 h-4" fill={feedback === "up" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleFeedback(assistantIdx, "down")}
                          disabled={!!feedback}
                          className={`p-1.5 rounded-lg transition-all ${
                            feedback === "down"
                              ? "text-red-500 bg-red-50"
                              : feedback
                              ? "text-stone-300"
                              : "text-stone-400 hover:text-red-500 hover:bg-red-50"
                          }`}
                          title="Not helpful"
                        >
                          <svg className="w-4 h-4" fill={feedback === "down" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="inline-block bg-primary-gradient text-white rounded-2xl rounded-tr-md px-5 py-3 max-w-[85%] text-sm shadow-soft-md">
                    {msg.content}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-start gap-3 mb-6">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-primary-gradient rounded-lg scale-110 opacity-80" />
                <div className="relative w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-sm">📊</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-5 py-3 text-sm text-stone-500 border border-stone-200 shadow-soft-sm">
                <span className="inline-flex gap-1">
                  <span className="animate-pulse">•</span>
                  <span className="animate-pulse" style={{ animationDelay: '150ms' }}>•</span>
                  <span className="animate-pulse" style={{ animationDelay: '300ms' }}>•</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-stone-200 p-5 bg-white">
          <div className="flex gap-3 max-w-2xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={selectedTopic ? `Ask about ${selectedTopic.name}...` : "Ask a question..."}
              className="flex-1 border border-stone-200 rounded-full px-5 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 text-sm bg-stone-50 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-primary-gradient disabled:opacity-40 text-white p-3 rounded-full transition-all hover:shadow-lg disabled:hover:shadow-none"
              style={{ boxShadow: !isLoading && input.trim() ? '0 4px 14px rgba(15, 118, 110, 0.3)' : undefined }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
