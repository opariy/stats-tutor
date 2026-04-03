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

    // Load chat history
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

    // If a topic is selected, prepend context to the message
    let messageContent = input.trim();
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

  // Get assistant message index for feedback
  const getAssistantIndex = (messageIndex: number) => {
    let count = 0;
    for (let i = 0; i <= messageIndex; i++) {
      if (messages[i]?.role === "assistant") count++;
    }
    return count - 1;
  };

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
          <span className="text-sm">📊</span>
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0 || isLoading;

  if (!hasMessages) {
    return (
      <div className="flex h-screen bg-white">
        {/* Topic Picker Sidebar */}
        <div className="hidden md:block">
          <TopicPicker onSelectTopic={setSelectedTopic} selectedTopic={selectedTopic} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Topic Toggle */}
          <div className="md:hidden border-b border-gray-100 p-3">
            <button
              onClick={() => setShowTopicPicker(!showTopicPicker)}
              className="flex items-center gap-2 text-sm text-gray-600"
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
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold">Select Topic</h2>
                <button onClick={() => setShowTopicPicker(false)} className="text-gray-500">
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

          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Stats 101 Exam Prep</h1>
            <p className="text-gray-500 text-sm mb-2">Chapters 1-10</p>

            {selectedTopic && (
              <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm mb-4">
                Focused on: {selectedTopic.name}
              </div>
            )}

            <div className="w-full max-w-md">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={selectedTopic ? `Ask about ${selectedTopic.name}...` : "Ask a question..."}
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2.5 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick topic suggestions */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
              <button
                onClick={() => setInput("What's the difference between Type I and Type II errors?")}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
              >
                Type I vs Type II errors
              </button>
              <button
                onClick={() => setInput("How do I know when to use a t-test vs z-test?")}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
              >
                t-test vs z-test
              </button>
              <button
                onClick={() => setInput("Explain confidence intervals")}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
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
    <div className="flex h-screen bg-white">
      {/* Topic Picker Sidebar */}
      <div className="hidden md:block">
        <TopicPicker onSelectTopic={setSelectedTopic} selectedTopic={selectedTopic} />
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm">📊</span>
            </div>
            <div>
              <h1 className="text-sm font-medium text-gray-900">Stats Tutor</h1>
              <p className="text-xs text-gray-500">
                {selectedTopic ? selectedTopic.name : "Chapters 1-10"}
              </p>
            </div>
          </div>

          {/* Mobile topic toggle */}
          <button
            onClick={() => setShowTopicPicker(!showTopicPicker)}
            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Topic Picker Overlay */}
        {showTopicPicker && (
          <div className="md:hidden absolute inset-0 z-50 bg-white">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Select Topic</h2>
              <button onClick={() => setShowTopicPicker(false)} className="text-gray-500">
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

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.map((msg, i) => {
            const assistantIdx = msg.role === "assistant" ? getAssistantIndex(i) : -1;
            const feedback = assistantIdx >= 0 ? feedbackGiven[assistantIdx] : undefined;

            return (
              <div key={i} className={`mb-4 ${msg.role === "user" ? "text-right" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">📊</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] text-sm text-gray-800">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                            code: ({ children }) => (
                              <code className="bg-gray-200 px-1 rounded text-sm">{children}</code>
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
                          className={`p-1 rounded transition-colors ${
                            feedback === "up"
                              ? "text-green-600"
                              : feedback
                              ? "text-gray-300"
                              : "text-gray-400 hover:text-green-600"
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
                          className={`p-1 rounded transition-colors ${
                            feedback === "down"
                              ? "text-red-600"
                              : feedback
                              ? "text-gray-300"
                              : "text-gray-400 hover:text-red-600"
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
                  <div className="inline-block bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-sm">
                    {msg.content}
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-start gap-2 mb-4">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs">📊</span>
              </div>
              <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-500">
                <span className="inline-flex gap-1">
                  <span className="animate-pulse">•</span>
                  <span className="animate-pulse delay-100">•</span>
                  <span className="animate-pulse delay-200">•</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-100 p-4">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={selectedTopic ? `Ask about ${selectedTopic.name}...` : "Ask a question..."}
              className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2.5 rounded-full transition-colors"
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
