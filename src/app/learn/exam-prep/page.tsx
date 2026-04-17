"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Phase = "upload" | "processing" | "generating" | "redirecting";

interface ExtractedFile {
  fileName: string;
  fileType: string;
  text: string;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export default function ExamPrepPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState("");

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

    // Validate each file
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        return;
      }
    }

    // Check total count
    if (files.length + fileArray.length > MAX_FILES) {
      setError(`You can only upload up to ${MAX_FILES} files.`);
      return;
    }

    setError(null);
    setFiles((prev) => [...prev, ...fileArray]);
  }, [files.length]);

  // Handle paste from clipboard (images or text)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (phase !== "upload") return;

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
      } else if (pastedText && pastedText.trim().length > 0) {
        // Put pasted text into the textarea (append if there's already content)
        e.preventDefault();
        setPastedText((prev) => prev ? prev + "\n\n" + pastedText : pastedText);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [phase, handleFiles]);

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

    setPhase("processing");
    setError(null);
    const extracted: ExtractedFile[] = [];

    // Process uploaded files
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
        setPhase("upload");
        return;
      }
    }

    // Include pasted text if present
    if (hasPastedText) {
      extracted.push({
        fileName: "pasted-text",
        fileType: "text",
        text: pastedText.trim(),
      });
    }

    setExtractedFiles(extracted);
    generateCurriculum(extracted);
  };

  const generateCurriculum = async (extracted: ExtractedFile[]) => {
    setPhase("generating");

    // Combine all extracted text
    const combinedText = extracted
      .map((f) => `--- ${f.fileName} ---\n${f.text}`)
      .join("\n\n");

    // Get or create session ID
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
              setPhase("redirecting");
            } else if (data.type === "complete") {
              router.push(data.redirectUrl);
            } else if (data.type === "error") {
              setError(data.error);
              setPhase("upload");
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("upload");
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
    if (name.endsWith(".docx")) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1l.75 3 .75-3h1l-1.25 5h-1l-.75-3-.75 3h-1L7 13h1l.75 3 .75-3z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
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
        <div className="bg-white border border-stone-200 rounded-2xl shadow-soft-md overflow-hidden">
          {/* Page Header */}
          <div className="px-6 py-5 border-b border-stone-100">
            <h1 className="font-display text-xl font-bold text-stone-900 tracking-tight">
              Exam Prep
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Upload your syllabus, notes, or curriculum files and AI will create a study plan
            </p>
          </div>

          <div className="p-6">
            {/* Upload Phase */}
            {phase === "upload" && (
              <>
                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
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

                  <div className="w-14 h-14 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>

                  <p className="text-stone-700 font-medium mb-1">
                    Drop files, click to browse, or paste a screenshot
                  </p>
                  <p className="text-sm text-stone-500">
                    PDF, DOCX, TXT, or images (up to 10MB each)
                  </p>
                </div>

                {/* Or divider */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-xs text-stone-400 font-medium">OR PASTE TEXT</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                {/* Text input */}
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your curriculum, syllabus, or course outline here..."
                  className="w-full h-32 p-4 border border-stone-200 rounded-xl text-sm text-stone-700 placeholder-stone-400 resize-none focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
                />

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
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
                          onClick={() => removeFile(index)}
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
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <Link
                    href="/"
                    className="flex-1 py-3 px-4 text-center border border-stone-200 rounded-xl text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </Link>
                  <button
                    onClick={processFiles}
                    disabled={files.length === 0 && pastedText.trim().length < 5}
                    className="flex-1 py-3 px-4 bg-primary-gradient text-white font-medium rounded-xl disabled:opacity-40 transition-all hover:shadow-lg disabled:hover:shadow-none"
                  >
                    Generate Study Plan
                  </button>
                </div>
              </>
            )}

            {/* Processing Phase */}
            {phase === "processing" && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <svg className="animate-spin w-16 h-16 text-teal-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h2 className="font-display text-lg font-semibold text-stone-900 mb-2">
                  Extracting content
                </h2>
                <p className="text-sm text-stone-500">
                  Processing file {processingIndex + 1} of {files.length}: {files[processingIndex]?.name}
                </p>
              </div>
            )}

            {/* Generating Phase */}
            {phase === "generating" && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <svg className="animate-spin w-16 h-16 text-teal-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h2 className="font-display text-lg font-semibold text-stone-900 mb-2">
                  Generating your curriculum
                </h2>
                <p className="text-sm text-stone-500">
                  AI is analyzing your materials and creating a personalized study plan
                </p>
              </div>
            )}

            {/* Redirecting Phase */}
            {phase === "redirecting" && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="font-display text-lg font-semibold text-stone-900 mb-2">
                  Course created!
                </h2>
                <p className="text-sm text-stone-500">
                  Redirecting you to your new study plan...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Help text */}
        {phase === "upload" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-500">
              Supports syllabi, course outlines, textbook tables of contents, and study notes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
