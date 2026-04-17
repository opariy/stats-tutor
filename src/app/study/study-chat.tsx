"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import dynamic from "next/dynamic";
import ChatSidebar from "./chat-sidebar";

// Dynamic import for visualization renderer (heavy dependencies)
const VisualizationRenderer = dynamic(
  () => import("@/components/visualizations/VisualizationRenderer"),
  { ssr: false }
);
import TopicQuiz from "./topic-quiz";
import FeedbackModal from "../components/feedback-modal";
import MessageFeedbackModal from "../components/message-feedback-modal";

// Check if content between $ signs is actually math (not currency)
function isActualMath(content: string): boolean {
  const trimmed = content.trim();
  // CURRENCY: starts with number like $3, $100, $3.50
  if (/^\d/.test(trimmed)) return false;
  // MATH: LaTeX commands, parentheses with letters, equals, operators
  if (/\\[a-zA-Z]+/.test(content)) return true;
  if (/[a-zA-Z]\s*\(/.test(content)) return true;
  if (/[a-zA-Z]\s*=/.test(content) || /=\s*[a-zA-Z]/.test(content)) return true;
  if (/\d+\s*[a-zA-Z]/.test(content)) return true;
  if (/[a-zA-Z]\s*[+\-\*\/\^]/.test(content) || /[+\-\*\/\^]\s*[a-zA-Z]/.test(content)) return true;
  if (/[\^_]/.test(content)) return true;
  if (/^[a-zA-Z]$/.test(trimmed)) return true;
  return false;
}

// Check if content has visualization syntax
function hasVisualizationSyntax(content: string): boolean {
  // Check viz blocks and mermaid
  if (/```viz:\w+/.test(content)) return true;
  if (/```mermaid/.test(content)) return true;
  // Check display math
  if (/\$\$[\s\S]*?\$\$/.test(content)) return true;

  // Check inline math - but only if it's actual math, not currency
  const inlineMathRegex = /\$([^\$\n]+?)\$/g;
  let match;
  while ((match = inlineMathRegex.exec(content)) !== null) {
    if (isActualMath(match[1])) {
      return true;
    }
  }

  return false;
}

// Extract prerequisite gap info from message content
function extractPrerequisiteGap(content: string): { concept: string; severity: string } | null {
  const match = content.match(/<!--\s*PREREQUISITE_GAP:\s*({[^}]+})\s*-->/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      return { concept: data.concept, severity: data.severity };
    } catch {
      return null;
    }
  }
  return null;
}

// Component to render message content with visualizations or plain markdown
function MessageContent({ content }: { content: string }) {
  // Strip any OBJECTIVE_UPDATE and PREREQUISITE_GAP comments before rendering
  const cleanContent = useMemo(() => {
    return content
      .replace(/<!--\s*OBJECTIVE_UPDATE:.*?-->/g, "")
      .replace(/<!--\s*PREREQUISITE_GAP:.*?-->/g, "")
      .trim();
  }, [content]);

  const hasViz = useMemo(() => hasVisualizationSyntax(cleanContent), [cleanContent]);

  if (hasViz) {
    return <VisualizationRenderer content={cleanContent} />;
  }

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed whitespace-pre-line">{children}</p>,
        ul: ({ children }) => <ul className="list-disc ml-4 mb-3">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-4 mb-3">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-stone-900">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-stone-900">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-stone-800">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-teal-300 pl-4 my-3 text-stone-600 italic">
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded text-sm font-mono border border-teal-100">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-stone-50 p-3 rounded-lg mb-3 overflow-x-auto border border-stone-200">
            {children}
          </pre>
        ),
      }}
    >
      {cleanContent}
    </ReactMarkdown>
  );
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  topicId: string | null;
  courseId?: string | null;
  topicName?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

type CourseData = {
  id: string;
  name: string;
  subjectDescription: string | null;
  chapters: Array<{
    id: string;
    number: number;
    title: string;
    sortOrder?: number | null;
    topics: Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      suggestions: string[];
      sortOrder?: number | null;
    }>;
  }>;
};

type TopicStatus = {
  topicId: string;
  status: "locked" | "in_progress" | "quiz_ready" | "completed";
  coreObjectivesPassed: number;
  totalCoreObjectives: number;
};

type ObjectiveData = {
  id: string;
  objective: string;
  checkMethod: "conversational" | "quiz_mcq" | "quiz_free_text";
  difficulty: "core" | "advanced";
  status: "not_started" | "attempted" | "passed" | "failed";
};

type TopicProgressData = {
  topicId: string;
  topicName: string;
  status: string;
  coreObjectivesPassed: number;
  totalCoreObjectives: number;
  objectives: ObjectiveData[];
};

type QuizData = {
  quizId: string;
  topicName: string;
  questions: Array<{
    objectiveId: string;
    question: string;
    type: "mcq" | "free_text";
    options?: string[];
  }>;
};

// Example prompts that rotate to help students discover what they can ask
const EXAMPLE_PROMPTS = [
  { label: "Confidence intervals", prompt: "Explain confidence intervals" },
  { label: "Type I vs Type II errors", prompt: "What's the difference between Type I and Type II errors?" },
  { label: "t-test vs z-test", prompt: "When do I use t-test vs z-test?" },
  { label: "Bayes' theorem", prompt: "Help me understand Bayes' theorem" },
  { label: "Normal distribution", prompt: "What makes the normal distribution so important?" },
  { label: "Hypothesis testing", prompt: "Walk me through hypothesis testing steps" },
  { label: "Sample size", prompt: "How do I determine the right sample size?" },
  { label: "Central Limit Theorem", prompt: "Explain the Central Limit Theorem" },
  { label: "P-values", prompt: "What exactly is a p-value?" },
];

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  // First, check if user has an email (enrolled via /join)
  const email = localStorage.getItem("stats-tutor-email");
  if (email) {
    // Use email as session identifier (will be used to find/create user)
    return email;
  }

  // Fall back to anonymous session for non-enrolled users
  const stored = localStorage.getItem("stats-tutor-session");
  if (stored) return stored;
  const sessionId = crypto.randomUUID();
  localStorage.setItem("stats-tutor-session", sessionId);
  return sessionId;
}

function getOrAssignGroup(): "krokyo" | "control" {
  if (typeof window === "undefined") return "krokyo";
  const stored = localStorage.getItem("stats-tutor-group");
  if (stored === "krokyo" || stored === "control") return stored;
  const group = Math.random() < 0.5 ? "krokyo" : "control";
  localStorage.setItem("stats-tutor-group", group);
  return group;
}

// Get 3 random example prompts
function getRandomPrompts() {
  const shuffled = [...EXAMPLE_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export default function StudyChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [group, setGroup] = useState<"krokyo" | "control">("krokyo");
  const [sessionId, setSessionId] = useState("");
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, "up" | "down">>({});
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarKey, setSidebarKey] = useState(0); // To force refresh sidebar
  const [examplePrompts, setExamplePrompts] = useState(EXAMPLE_PROMPTS.slice(0, 3));
  const [masteryDeclared, setMasteryDeclared] = useState(false);
  const [declaringMastery, setDeclaringMastery] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<{
    assistantIndex: number;
    rating: "up" | "down";
  } | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [topicStatuses, setTopicStatuses] = useState<TopicStatus[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeTopicProgress, setActiveTopicProgress] = useState<TopicProgressData | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [courseLoading, setCourseLoading] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [pendingPrerequisite, setPendingPrerequisite] = useState<{
    concept: string;
    messageIndex: number;
    isAdding: boolean;
  } | null>(null);
  const [returnToTopicId, setReturnToTopicId] = useState<string | null>(null);
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const [returnTopicName, setReturnTopicName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoStartTriggered = useRef(false);
  const searchParams = useSearchParams();
  const fromDemo = searchParams.get("from") === "demo";
  const courseId = searchParams.get("course");

  // Initialize session and randomize example prompts
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    setGroup(getOrAssignGroup());
    if (!courseId) {
      setExamplePrompts(getRandomPrompts());
    }

    // Load returnToTopicId from localStorage
    const savedReturnTopicId = localStorage.getItem("stats-tutor-return-topic-id");
    const savedReturnTopicName = localStorage.getItem("stats-tutor-return-topic-name");
    if (savedReturnTopicId) {
      setReturnToTopicId(savedReturnTopicId);
    }
    if (savedReturnTopicName) {
      setReturnTopicName(savedReturnTopicName);
    }
  }, [courseId]);

  // Load course data if courseId is present
  useEffect(() => {
    if (!courseId) {
      setCourseData(null);
      return;
    }

    const loadCourse = async () => {
      setCourseLoading(true);
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (res.ok) {
          const data = await res.json();
          setCourseData(data.course);

          // Generate example prompts from course topics
          const allSuggestions: { label: string; prompt: string }[] = [];
          data.course.chapters?.forEach((chapter: CourseData['chapters'][0]) => {
            chapter.topics?.forEach((topic) => {
              if (topic.suggestions && topic.suggestions.length > 0) {
                topic.suggestions.forEach((suggestion: string) => {
                  allSuggestions.push({ label: topic.name, prompt: suggestion });
                });
              } else {
                allSuggestions.push({
                  label: topic.name,
                  prompt: `Help me understand ${topic.name}`,
                });
              }
            });
          });

          // Pick 3 random suggestions
          const shuffled = allSuggestions.sort(() => Math.random() - 0.5);
          setExamplePrompts(shuffled.slice(0, 3));
        }
      } catch (error) {
        console.error("Failed to load course:", error);
      } finally {
        setCourseLoading(false);
      }
    };

    loadCourse();
  }, [courseId]);

  // Load topic progress when course and session are available
  useEffect(() => {
    if (!courseId || !sessionId) return;

    const loadProgress = async () => {
      try {
        const res = await fetch(
          `/api/progress?sessionId=${encodeURIComponent(sessionId)}&courseId=${courseId}`
        );
        if (res.ok) {
          const data = await res.json();
          // Transform to TopicStatus array
          const statuses: TopicStatus[] = data.topics.map((t: TopicProgressData) => ({
            topicId: t.topicId,
            status: t.status,
            coreObjectivesPassed: t.coreObjectivesPassed,
            totalCoreObjectives: t.totalCoreObjectives,
          }));
          setTopicStatuses(statuses);
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      }
    };

    loadProgress();
  }, [courseId, sessionId, sidebarKey]); // Refresh when sidebar refreshes

  // Load active topic progress when topic changes
  useEffect(() => {
    if (!activeTopicId || !sessionId || !courseId) {
      setActiveTopicProgress(null);
      return;
    }

    const loadTopicProgress = async () => {
      try {
        const res = await fetch(
          `/api/progress?sessionId=${encodeURIComponent(sessionId)}&courseId=${courseId}`
        );
        if (res.ok) {
          const data = await res.json();
          const topicData = data.topics.find((t: TopicProgressData) => t.topicId === activeTopicId);
          if (topicData) {
            setActiveTopicProgress(topicData);
          }
        }
      } catch (error) {
        console.error("Failed to load topic progress:", error);
      }
    };

    loadTopicProgress();
  }, [activeTopicId, sessionId, courseId, messages.length]); // Refresh after each message

  // Auto-start conversation when course loads (for new learners)
  useEffect(() => {
    // Only auto-start once per course session
    if (autoStartTriggered.current) return;

    // Only auto-start if:
    // 1. We have course data
    // 2. We have a session ID
    // 3. No active conversation
    // 4. No messages
    // 5. Not currently loading
    if (
      courseData &&
      sessionId &&
      !activeConversation &&
      messages.length === 0 &&
      !isLoading &&
      !courseLoading
    ) {
      autoStartTriggered.current = true;
      setAutoStarted(true);

      // Get the first chapter and topic
      const firstChapter = [...courseData.chapters]
        .sort((a, b) => a.number - b.number)[0];
      const firstTopic = firstChapter?.topics
        ? [...firstChapter.topics].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]
        : null;

      if (firstTopic) {
        // Set active topic for objectives tracking
        setActiveTopicId(firstTopic.id);

        // Auto-send a start learning prompt (inline implementation to avoid dependency)
        const autoStart = async () => {
          const messageContent = `I'm ready to start learning! Let's begin with ${firstTopic.name}.`;

          // Create conversation
          let convId: string | undefined;
          try {
            const res = await fetch("/api/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, group, courseId }),
            });
            const data = await res.json();
            if (data.conversation) {
              setActiveConversation(data.conversation);
              convId = data.conversation.id;
              setSidebarKey((k) => k + 1);
            }
          } catch (error) {
            console.error("Failed to create conversation:", error);
            return;
          }

          const userMessage: Message = { role: "user", content: messageContent };
          setMessages([userMessage]);
          setIsLoading(true);

          try {
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: [userMessage],
                group,
                sessionId,
                conversationId: convId,
                topicId: firstTopic.id,
                courseId,
              }),
            });

            if (!response.ok) throw new Error("Failed to get response");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No reader available");

            let fullContent = "";
            let hasStarted = false;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              fullContent += chunk;

              if (!hasStarted) {
                hasStarted = true;
                setMessages([userMessage, { role: "assistant", content: fullContent }]);
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: fullContent };
                  return updated;
                });
              }
            }

            setSidebarKey((k) => k + 1);
          } catch (error) {
            console.error("Failed to auto-start:", error);
          } finally {
            setIsLoading(false);
          }
        };

        autoStart();
      }
    }
  }, [courseData, sessionId, activeConversation, messages.length, isLoading, courseLoading, group, courseId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when tutor finishes responding
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [isLoading, messages.length]);

  // Load conversation messages
  const loadConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/history?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setFeedbackGiven({});
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setMessages([]);
    }
  };

  // Handle selecting a conversation from sidebar
  const handleSelectConversation = async (conversation: Conversation) => {
    setActiveConversation(conversation);
    setMasteryDeclared(false); // Reset mastery state for new conversation
    await loadConversation(conversation.id);
    setShowSidebar(false);
  };

  // Handle declaring topic mastery
  const handleDeclareMastery = async () => {
    if (!activeConversation?.id || !activeConversation?.topicId || declaringMastery || masteryDeclared) return;

    setDeclaringMastery(true);
    try {
      const res = await fetch("/api/mastery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          conversationId: activeConversation.id,
          topicId: activeConversation.topicId,
        }),
      });

      if (res.ok) {
        setMasteryDeclared(true);
      }
    } catch (error) {
      console.error("Failed to declare mastery:", error);
    } finally {
      setDeclaringMastery(false);
    }
  };

  // Handle creating a new chat - no topic selection, just start chatting
  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setFeedbackGiven({});
    setMasteryDeclared(false);
    setShowSidebar(false);
    setExamplePrompts(getRandomPrompts()); // Refresh example prompts
  };

  // Handle deleting a conversation from sidebar
  const handleDeleteConversation = (conversationId: string) => {
    if (activeConversation?.id === conversationId) {
      setActiveConversation(null);
      setMessages([]);
      setFeedbackGiven({});
    }
  };

  // Handle sending a message (optionally with a direct prompt)
  const handleSend = async (directPrompt?: string) => {
    const messageContent = directPrompt?.trim() || input.trim();
    if (!messageContent || isLoading || !sessionId) return;

    // Create conversation if none active
    let convId = activeConversation?.id;
    if (!convId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, group, courseId: courseId || undefined }),
        });
        const data = await res.json();
        if (data.conversation) {
          setActiveConversation(data.conversation);
          convId = data.conversation.id;
          setSidebarKey((k) => k + 1);
        }
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return;
      }
    }

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
          conversationId: convId,
          courseId: courseId || undefined,
          topicId: activeTopicId || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

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
            updated[updated.length - 1] = { role: "assistant", content: fullContent };
            return updated;
          });
        }
      }

      // Refresh sidebar to show updated conversation
      setSidebarKey((k) => k + 1);

      // Refresh again after title generation and topic tagging completes (async)
      if (newMessages.length <= 2) {
        setTimeout(() => setSidebarKey((k) => k + 1), 3000);
      }

      // Poll for topicId if conversation doesn't have one yet (auto-tagging is async)
      if (convId && !activeConversation?.topicId) {
        const pollForTopic = async () => {
          try {
            const res = await fetch(`/api/conversations/${convId}`);
            const data = await res.json();
            if (data.conversation?.topicId) {
              setActiveConversation(data.conversation);
            }
          } catch {
            // Ignore polling errors
          }
        };
        // Poll after 2s and 5s to catch async topic tagging
        setTimeout(pollForTopic, 2000);
        setTimeout(pollForTopic, 5000);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (assistantIndex: number, rating: "up" | "down") => {
    if (feedbackGiven[assistantIndex]) return;

    // Immediately record the rating
    setFeedbackGiven((prev) => ({ ...prev, [assistantIndex]: rating }));

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messageIndex: assistantIndex,
          rating,
        }),
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }

    // Show modal for optional comment
    setMessageFeedback({ assistantIndex, rating });
  };

  const submitMessageFeedback = async (comment: string) => {
    if (!messageFeedback || !comment.trim()) {
      setMessageFeedback(null);
      return;
    }

    const { assistantIndex, rating } = messageFeedback;

    try {
      // Update feedback with comment
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messageIndex: assistantIndex,
          rating,
          comment: comment.trim(),
        }),
      });
    } catch (error) {
      console.error("Failed to submit feedback comment:", error);
    }

    setMessageFeedback(null);
  };

  const getAssistantIndex = (messageIndex: number) => {
    let count = 0;
    for (let i = 0; i <= messageIndex; i++) {
      if (messages[i]?.role === "assistant") count++;
    }
    return count - 1;
  };

  // Handle starting a topic from the curriculum
  const handleStartTopic = (topicName: string, topicId: string) => {
    setActiveTopicId(topicId);
    handleSend(`Let's learn about ${topicName}.`);
  };

  // Handle starting a quiz
  const handleStartQuiz = async () => {
    if (!activeTopicId || !sessionId) return;

    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          topicId: activeTopicId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuizData(data);
          setShowQuiz(true);
        } else {
          alert("No quiz questions available for this topic.");
        }
      }
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      alert("Failed to generate quiz. Please try again.");
    }
  };

  // Handle quiz completion
  const handleQuizComplete = async (passed: boolean, score: number) => {
    setShowQuiz(false);
    setQuizData(null);

    if (passed && activeTopicId) {
      // Unlock next topic
      try {
        await fetch("/api/progress/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            completedTopicId: activeTopicId,
          }),
        });

        // Refresh progress
        setSidebarKey((k) => k + 1);
      } catch (error) {
        console.error("Failed to unlock next topic:", error);
      }

      // Check if there's a return topic (user was doing prerequisite)
      const savedReturnTopicId = localStorage.getItem("stats-tutor-return-topic-id");
      if (savedReturnTopicId && savedReturnTopicId !== activeTopicId) {
        // Show return prompt
        setShowReturnPrompt(true);
      }
    }

    // Refresh topic progress
    setActiveTopicProgress(null);
    setSidebarKey((k) => k + 1);
  };

  // Handle accepting prerequisite module offer
  const handleAcceptPrerequisite = async (concept: string) => {
    if (!courseId) return;

    setPendingPrerequisite((prev) =>
      prev ? { ...prev, isAdding: true } : null
    );

    try {
      // Store current topic to return to after prerequisite (in state and localStorage)
      if (activeTopicId && activeTopicProgress?.topicName) {
        setReturnToTopicId(activeTopicId);
        setReturnTopicName(activeTopicProgress.topicName);
        localStorage.setItem("stats-tutor-return-topic-id", activeTopicId);
        localStorage.setItem("stats-tutor-return-topic-name", activeTopicProgress.topicName);
      }

      const res = await fetch(`/api/courses/${courseId}/add-prerequisite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept,
          evidence: `Detected during conversation`,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Reload course data to get the new prerequisite chapter
        const courseRes = await fetch(`/api/courses/${courseId}`);
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setCourseData(courseData.course);
        }

        // Add a system message about the prerequisite being added
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant" as const,
            content: `I've added a quick "${data.chapter.title}" module to your course (about ${data.estimatedMinutes} minutes). You can find it in the sidebar. After completing it, you'll be better prepared to continue with ${activeTopicProgress?.topicName || "the current topic"}.`,
          },
        ]);

        setSidebarKey((k) => k + 1);
      } else {
        console.error("Failed to add prerequisite");
      }
    } catch (error) {
      console.error("Error adding prerequisite:", error);
    } finally {
      setPendingPrerequisite(null);
    }
  };

  // Handle declining prerequisite module offer
  const handleDeclinePrerequisite = () => {
    setPendingPrerequisite(null);
    // Add a message acknowledging the decline
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant" as const,
        content: "No problem! Let's continue. Feel free to ask if you need clarification on any concepts.",
      },
    ]);
  };

  // Handle returning to original topic after prerequisite
  const handleReturnToOriginalTopic = () => {
    const topicId = localStorage.getItem("stats-tutor-return-topic-id");
    const topicName = localStorage.getItem("stats-tutor-return-topic-name") || "the original topic";

    // Clear the stored return topic
    localStorage.removeItem("stats-tutor-return-topic-id");
    localStorage.removeItem("stats-tutor-return-topic-name");
    setReturnToTopicId(null);
    setReturnTopicName(null);
    setShowReturnPrompt(false);

    if (topicId) {
      // Navigate to the original topic
      setActiveTopicId(topicId);
      setMessages([]);
      setActiveTopicProgress(null);

      // Add welcome back message
      setMessages([
        {
          role: "assistant" as const,
          content: `Great job completing the prerequisite! Now that you have a stronger foundation, let's continue with "${topicName}". How would you like to proceed?`,
        },
      ]);
    }
  };

  // Handle staying to continue with more topics
  const handleStayOnPrerequisite = () => {
    setShowReturnPrompt(false);
    // Add a message acknowledging staying
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant" as const,
        content: "Excellent! Let's continue building your foundation. Would you like to move on to the next topic?",
      },
    ]);
  };

  // Detect prerequisite offers in messages
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const gap = extractPrerequisiteGap(lastMessage.content);
    if (gap && !pendingPrerequisite) {
      setPendingPrerequisite({
        concept: gap.concept,
        messageIndex: messages.length - 1,
        isAdding: false,
      });
    }
  }, [messages, pendingPrerequisite]);

  return (
    <div className="flex h-screen bg-stone-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <ChatSidebar
          key={sidebarKey}
          sessionId={sessionId}
          courseId={courseId || undefined}
          courseName={courseData?.name}
          courseChapters={courseData?.chapters}
          topicStatuses={topicStatuses}
          activeConversationId={activeConversation?.id || null}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onStartTopic={handleStartTopic}
          onChangeDifficulty={() => window.location.href = "/learn/new"}
          activeTopicProgress={activeTopicProgress}
          onStartQuiz={handleStartQuiz}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/20" onClick={() => setShowSidebar(false)}>
          <div className="w-72 h-full" onClick={(e) => e.stopPropagation()}>
            <ChatSidebar
              key={sidebarKey}
              sessionId={sessionId}
              courseId={courseId || undefined}
              courseName={courseData?.name}
              courseChapters={courseData?.chapters}
              topicStatuses={topicStatuses}
              activeConversationId={activeConversation?.id || null}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              onDeleteConversation={handleDeleteConversation}
              onStartTopic={handleStartTopic}
              onChangeDifficulty={() => window.location.href = "/learn/new"}
              activeTopicProgress={activeTopicProgress}
              onStartQuiz={handleStartQuiz}
            />
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuiz && quizData && (
        <TopicQuiz
          quizId={quizData.quizId}
          topicName={quizData.topicName}
          questions={quizData.questions}
          sessionId={sessionId}
          onComplete={handleQuizComplete}
          onClose={() => {
            setShowQuiz(false);
            setQuizData(null);
          }}
        />
      )}

      {/* Return to Original Topic Modal */}
      {showReturnPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-stone-200">
              <h2 className="font-display text-xl font-bold text-stone-900">
                Ready to Continue?
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-stone-600">
                Great job completing this prerequisite topic! You now have a stronger foundation.
              </p>
              <p className="text-stone-700 font-medium">
                Would you like to return to &ldquo;{returnTopicName || "your original topic"}&rdquo; or continue with more prerequisite topics?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleReturnToOriginalTopic}
                  className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                >
                  Return to {returnTopicName ? `"${returnTopicName}"` : "Original Topic"}
                </button>
                <button
                  onClick={handleStayOnPrerequisite}
                  className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-lg transition-colors"
                >
                  Continue Here
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
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
                <p className="text-xs text-stone-500 hidden sm:block">
                  {courseData ? courseData.name : "Ask me anything about statistics"}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Back to demo link - only show if came from demo */}
            {fromDemo && (
              <Link
                href="/demo"
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                ← Back to Demo
              </Link>
            )}

            {/* Feedback button */}
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Send feedback or report a bug"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>

            {/* New chat button */}
            <button
              onClick={handleNewChat}
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              title="New chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          sessionId={sessionId}
        />

        {/* Message Feedback Modal */}
        <MessageFeedbackModal
          isOpen={messageFeedback !== null}
          onClose={() => setMessageFeedback(null)}
          onSubmit={submitMessageFeedback}
          rating={messageFeedback?.rating || "up"}
        />

        {/* Messages or Empty State */}
        {courseLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-stone-500 text-sm">Loading course...</p>
            </div>
          </div>
        ) : messages.length === 0 && !isLoading ? (
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
              {courseData ? `Let's learn ${courseData.name}` : "What do you need help with?"}
            </h1>
            <p className="text-stone-500 text-sm mb-6">
              {courseData
                ? "Ask any question about the topics in this course"
                : "Ask any statistics question and I'll help you understand it"}
            </p>

            <div className="w-full max-w-lg">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask a question..."
                  className="flex-1 border border-stone-200 rounded-full px-5 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 text-sm bg-white shadow-soft-sm transition-all"
                  autoFocus
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="bg-primary-gradient disabled:opacity-40 text-white p-3 rounded-full transition-all hover:shadow-lg disabled:hover:shadow-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Example prompts */}
            <div className="mt-8 w-full max-w-lg">
              <p className="text-xs text-stone-400 text-center mb-3">Try asking:</p>
              <div className="flex flex-col gap-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(example.prompt)}
                    className="group flex items-center gap-3 text-left bg-white hover:bg-teal-50 border border-stone-200 hover:border-teal-200 text-stone-600 hover:text-teal-700 px-4 py-3 rounded-xl transition-all shadow-soft-sm hover:shadow-soft-md"
                  >
                    <span className="w-6 h-6 flex items-center justify-center bg-stone-100 group-hover:bg-teal-100 rounded-lg text-stone-400 group-hover:text-teal-600 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium">{example.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 bg-gradient-to-b from-stone-50 to-white">
              {messages.map((msg, i) => {
                const assistantIdx = msg.role === "assistant" ? getAssistantIndex(i) : -1;
                const feedback = assistantIdx >= 0 ? feedbackGiven[assistantIdx] : undefined;

                // Skip rendering assistant messages with empty content (still streaming)
                if (msg.role === "assistant" && !msg.content.trim()) {
                  return null;
                }

                return (
                  <div key={i} className={`mb-6 ${msg.role === "user" ? "text-right" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Image
                            src="/logo.png"
                            alt="Krokyo"
                            width={32}
                            height={32}
                            className="rounded-lg"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="bg-white rounded-2xl rounded-tl-md px-5 py-3 min-w-[300px] max-w-[85%] w-fit text-sm text-stone-800 border border-stone-200 shadow-soft-sm">
                            <MessageContent content={msg.content} />
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
                              <svg
                                className="w-4 h-4"
                                fill={feedback === "up" ? "currentColor" : "none"}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                />
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
                              <svg
                                className="w-4 h-4"
                                fill={feedback === "down" ? "currentColor" : "none"}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                                />
                              </svg>
                            </button>
                          </div>
                          {/* Prerequisite offer accept/decline buttons */}
                          {pendingPrerequisite && pendingPrerequisite.messageIndex === i && (
                            <div className="flex gap-2 mt-2 ml-1">
                              <button
                                onClick={() => handleAcceptPrerequisite(pendingPrerequisite.concept)}
                                disabled={pendingPrerequisite.isAdding}
                                className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                {pendingPrerequisite.isAdding ? (
                                  <>
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Add refresher
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleDeclinePrerequisite}
                                disabled={pendingPrerequisite.isAdding}
                                className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-medium rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50"
                              >
                                No thanks
                              </button>
                            </div>
                          )}
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
              {isLoading && (messages[messages.length - 1]?.role !== "assistant" || !messages[messages.length - 1]?.content.trim()) && (
                <div className="flex items-start gap-3 mb-6">
                  <div className="flex-shrink-0">
                    <Image
                      src="/logo.png"
                      alt="Krokyo"
                      width={32}
                      height={32}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-md px-5 py-3 text-sm text-stone-500 border border-stone-200 shadow-soft-sm">
                    <span className="animate-pulse">Thinking</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-stone-200 p-5 bg-white">
              {/* Quick Reply Buttons */}
              {!isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && (
                <div className="flex flex-wrap gap-2 mb-3 max-w-2xl mx-auto">
                  <button
                    onClick={() => handleSend("Give me a real-world example")}
                    className="px-3 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 text-stone-600 rounded-full hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all"
                  >
                    Show example
                  </button>
                  <button
                    onClick={() => handleSend("This is too hard, can you simplify?")}
                    className="px-3 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 text-stone-600 rounded-full hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all"
                  >
                    Too hard
                  </button>
                  <button
                    onClick={() => handleSend("I understand this, let's move on to something harder")}
                    className="px-3 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 text-stone-600 rounded-full hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all"
                  >
                    Too easy
                  </button>
                  <button
                    onClick={() => handleSend("Give me a practice problem")}
                    className="px-3 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 text-stone-600 rounded-full hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all"
                  >
                    Practice
                  </button>
                </div>
              )}
              <div className="flex gap-3 max-w-2xl mx-auto">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Ask a question..."
                  className="flex-1 border border-stone-200 rounded-full px-5 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 text-sm bg-stone-50 transition-all"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="bg-primary-gradient disabled:opacity-40 text-white p-3 rounded-full transition-all hover:shadow-lg disabled:hover:shadow-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
