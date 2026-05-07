"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { GeneratedCurriculum } from "@/lib/curriculum-generator";

type Step = "input" | "chat" | "generating" | "creating" | "processing" | "redirecting";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface ExtractedFile {
  fileName: string;
  fileType: string;
  text: string;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export default function NewLearnPage() {
  const router = useRouter();

  // Main state
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ========== CHAT FUNCTIONS ==========
  const handleSend = async (directPrompt?: string) => {
    const messageContent = directPrompt?.trim() || input.trim();
    if (!messageContent || isLoading) return;

    // Switch to chat mode
    if (step === "input") {
      setStep("chat");
    }

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
      let sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        sessionId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("sessionId", sessionId);
      }

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

  // ========== UPLOAD FUNCTIONS ==========
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large. Maximum size is 10MB.`;
    }

    const validTypes = Object.keys(ACCEPTED_TYPES);
    const validExtensions = Object.values(ACCEPTED_TYPES).flat();
    const extension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      return `${file.name} is not a supported file type.`;
    }

    return null;
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    for (const file of fileArray) {
      const err = validateFile(file);
      if (err) {
        setError(err);
        return;
      }
    }

    if (files.length + fileArray.length > MAX_FILES) {
      setError(`You can only upload up to ${MAX_FILES} files.`);
      return;
    }

    setError(null);
    setFiles((prev) => [...prev, ...fileArray]);
  }, [files.length]);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (step !== "input") return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      let pastedText: string | null = null;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
            const ext = file.type.split("/")[1] || "png";
            const namedFile = new File([file], `screenshot-${timestamp}.${ext}`, { type: file.type });
            imageFiles.push(namedFile);
          }
        } else if (item.type === "text/plain") {
          pastedText = e.clipboardData?.getData("text/plain") || null;
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        handleFiles(imageFiles);
      } else if (pastedText && pastedText.trim().length > 100) {
        // Long text (likely syllabus/document content) goes to paste area
        e.preventDefault();
        setPastedText((prev) => prev + (prev ? "\n" : "") + pastedText.trim());
      }
      // Short text passes through to focused input
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [step, handleFiles]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const processFiles = async () => {
    const hasPastedText = pastedText.trim().length >= 5;
    if (files.length === 0 && !hasPastedText) return;

    setStep("processing");
    setError(null);
    const extracted: ExtractedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      setProcessingIndex(i);
      const file = files[i];

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/learn/extract-content", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to extract content");
        }

        const data = await response.json();
        extracted.push({
          fileName: data.fileName,
          fileType: data.fileType,
          text: data.text,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file");
        setStep("input");
        return;
      }
    }

    if (hasPastedText) {
      extracted.push({
        fileName: "pasted-text",
        fileType: "text",
        text: pastedText.trim(),
      });
    }

    generateCurriculumFromFiles(extracted);
  };

  const generateCurriculumFromFiles = async (extracted: ExtractedFile[]) => {
    setStep("generating");

    const combinedText = extracted
      .map((f) => `--- ${f.fileName} ---\n${f.text}`)
      .join("\n\n");

    let sessionId = localStorage.getItem("sessionId");
    if (!sessionId) {
      sessionId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("sessionId", sessionId);
    }

    try {
      const response = await fetch("/api/learn/curriculum-from-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: combinedText,
          fileName: extracted.map((f) => f.fileName).join(", "),
          fileType: extracted[0]?.fileType || "text",
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate curriculum");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "status" && data.status === "creating_course") {
              setStep("redirecting");
            } else if (data.type === "complete") {
              router.push(data.redirectUrl);
            } else if (data.type === "error") {
              setError(data.error);
              setStep("input");
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("input");
    }
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type === "application/pdf" || name.endsWith(".pdf")) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9.5 14.5v3H8v-6h2.5a1.5 1.5 0 010 3H9.5zm0-1h1a.5.5 0 000-1h-1v1zm5 0h.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5h-.5v-3zm0-1h.5a1.5 1.5 0 011.5 1.5v2a1.5 1.5 0 01-1.5 1.5H13v-6h1.5v1zm-6.5 1v3h-1v-6h1l1.5 3v-3h1v6h-1l-1.5-3z" />
        </svg>
      );
    }
    if (type.startsWith("image/")) {
      return (
        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1l.75 3 .75-3h1l-1.25 5h-1l-.75-3-.75 3h-1L7 13h1l.75 3 .75-3z" />
        </svg>
      );
    }
    if (name.endsWith(".pptx") || name.endsWith(".ppt")) {
      return (
        <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9 13h2.5a1.5 1.5 0 010 3H10v2H9v-5zm1 2h1.5a.5.5 0 000-1H10v1z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const hasUploadContent = files.length > 0 || pastedText.trim().length >= 5;

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
            style={{ height: 'auto' }}
          />
          <span className="font-display text-xl font-bold text-stone-900 tracking-tight group-hover:text-teal-700 transition-colors">
            Krokyo
          </span>
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* ========== INPUT STEP - All options visible ========== */}
        {step === "input" && (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-soft-md overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100">
              <h1 className="font-display text-xl font-bold text-stone-900 tracking-tight">
                What do you want to learn?
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                Describe a topic or upload your course materials
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Text Input */}
              <div>
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    onDrop={(e) => {
                      // Redirect file drops to file handler
                      if (e.dataTransfer?.files?.length) {
                        e.preventDefault();
                        handleFiles(e.dataTransfer.files);
                      }
                    }}
                    onPaste={(e) => {
                      // Block long pastes on topic input - they should go to textarea
                      const text = e.clipboardData?.getData("text/plain");
                      if (text && text.length > 100) {
                        e.preventDefault();
                        setPastedText((prev) => prev + (prev ? "\n" : "") + text.trim());
                      }
                    }}
                    placeholder="e.g. Python, Calculus, Machine Learning..."
                    className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-sm bg-white transition-all"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="bg-primary-gradient disabled:opacity-40 text-white px-5 py-3 rounded-xl font-medium transition-all hover:shadow-lg disabled:hover:shadow-none flex items-center gap-2"
                  >
                    Start
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>

                {/* Quick topics */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {["Python", "Statistics", "Economics", "Calculus"].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleSend(topic)}
                      className="px-3 py-1.5 bg-stone-100 rounded-full text-xs text-stone-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 font-medium">OR UPLOAD MATERIALS</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* File Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                  ${isDragging
                    ? "border-teal-400 bg-teal-50"
                    : "border-stone-200 hover:border-teal-300 hover:bg-stone-50"
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={Object.entries(ACCEPTED_TYPES)
                    .flatMap(([type, exts]) => [type, ...exts])
                    .join(",")}
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  className="hidden"
                />

                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                <p className="text-stone-700 font-medium text-sm mb-1">
                  Drop files or click to browse
                </p>
                <p className="text-xs text-stone-500">
                  PDF, DOC, DOCX, PPT, PPTX, TXT, images • Paste screenshots with Cmd+V
                </p>
              </div>

              {/* Paste text area */}
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                onDrop={(e) => {
                  // Redirect file drops to file handler
                  if (e.dataTransfer?.files?.length) {
                    e.preventDefault();
                    handleFiles(e.dataTransfer.files);
                  }
                }}
                placeholder="Or paste your syllabus, curriculum, or notes here..."
                className="w-full h-24 p-4 border border-stone-200 rounded-xl text-sm text-stone-700 placeholder-stone-400 resize-none focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
              />

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg border border-stone-100"
                    >
                      {getFileIcon(file)}
                      <span className="flex-1 text-sm text-stone-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-stone-400">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Generate from uploads button */}
              {hasUploadContent && (
                <button
                  onClick={processFiles}
                  className="w-full py-3 px-4 bg-primary-gradient text-white font-medium rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2"
                >
                  Generate from materials
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========== CHAT STEP ========== */}
        {step === "chat" && (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-soft-md overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px', maxHeight: '700px' }}>
            <div className="px-6 py-4 border-b border-stone-100 flex-shrink-0">
              <h1 className="font-display text-xl font-bold text-stone-900 tracking-tight">
                Tell me more
              </h1>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-stone-50/50">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && msg.content && (
                      <div className="flex items-start gap-2 max-w-[85%]">
                        <div className="flex-shrink-0 mt-0.5">
                          <Image src="/logo.png" alt="Krokyo" width={28} height={28} className="rounded-lg" style={{ height: 'auto' }} />
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
                      <Image src="/logo.png" alt="Krokyo" width={28} height={28} className="rounded-lg" style={{ height: 'auto' }} />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-stone-500 border border-stone-200 shadow-soft-sm">
                      <span className="animate-pulse">Thinking</span>
                    </div>
                  </div>
                )}

                {/* Quick replies for experience level */}
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

                <div ref={messagesEndRef} />
              </div>
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
                  placeholder="Type your answer..."
                  className="flex-1 border border-stone-200 rounded-full px-5 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 text-sm bg-stone-50 transition-all"
                  disabled={isLoading}
                  autoFocus
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
          </div>
        )}

        {/* ========== LOADING STATES ========== */}
        {(step === "processing" || step === "generating" || step === "creating" || step === "redirecting") && (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-soft-md p-12 text-center">
            {step === "redirecting" ? (
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 mx-auto mb-4">
                <svg className="animate-spin w-16 h-16 text-teal-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
            <h2 className="font-display text-lg font-semibold text-stone-900 mb-2">
              {step === "processing" && "Extracting content"}
              {step === "generating" && "Generating your curriculum"}
              {step === "creating" && "Creating your course"}
              {step === "redirecting" && "Course created!"}
            </h2>
            <p className="text-sm text-stone-500">
              {step === "processing" && `Processing file ${processingIndex + 1} of ${files.length}`}
              {step === "generating" && "Creating chapters and topics tailored to you"}
              {step === "creating" && "Setting up your personalized learning experience"}
              {step === "redirecting" && "Redirecting you to your new course..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
