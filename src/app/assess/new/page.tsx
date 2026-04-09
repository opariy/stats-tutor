"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Question, Answer, Quiz } from "@/lib/assessment-types";
import { computeResults, type AssessmentResult } from "@/lib/assessment-types";

type Phase = "setup" | "quiz" | "results";

export default function AssessmentPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("setup");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup state - single field for exam/curriculum
  const [examInput, setExamInput] = useState("");
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(10);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Results state
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file");
      return;
    }

    setUploadedFile(file);
    setIsExtractingPdf(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/assess/extract-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to extract text from PDF");
      }

      const data = await response.json();
      if (data.text) {
        setExamInput((prev) =>
          prev ? `${prev}\n\n${data.text}` : data.text
        );
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      setError("Failed to extract text from PDF. You can manually paste the content instead.");
      setUploadedFile(null);
    } finally {
      setIsExtractingPdf(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!examInput.trim()) return;

    setIsGenerating(true);
    setError(null);

    // Detect if input is short (exam name) or long (curriculum)
    const input = examInput.trim();
    const isShortInput = input.length < 100 && !input.includes("\n");

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          // If short, treat as exam name; if long, treat as curriculum
          examName: isShortInput ? input : "Practice Quiz",
          curriculum: isShortInput ? null : input,
          questionCount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate quiz");
      }

      const data = await response.json();
      setQuiz(data.quiz);
      setPhase("quiz");
    } catch (err) {
      console.error("Quiz generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || !quiz) return;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correctIndex;

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      selectedIndex: selectedOption,
      isCorrect,
      topic: currentQuestion.topic,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
    } else {
      const computedResults = computeResults(updatedAnswers);
      setResults(computedResults);
      setPhase("results");
    }
  };

  const handleStudyWeakAreas = async () => {
    if (!results || results.failedTopics.length === 0 || !quiz) return;

    setIsCreatingCourse(true);
    setError(null);

    try {
      let sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        sessionId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("sessionId", sessionId);
      }

      const description = `I took a practice quiz and struggled with these topics: ${results.failedTopics.join(", ")}. Please help me understand these concepts better.`;

      const curriculumResponse = await fetch("/api/learn/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: description },
            { role: "assistant", content: "I'll create a focused study plan for those topics." },
            { role: "user", content: "Please make it comprehensive." },
          ],
          forceGenerate: true,
        }),
      });

      if (!curriculumResponse.ok) {
        throw new Error("Failed to generate curriculum");
      }

      const reader = curriculumResponse.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader available");

      let curriculum = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "curriculum") {
              curriculum = data.curriculum;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      if (!curriculum) throw new Error("Failed to generate curriculum");

      const createResponse = await fetch("/api/learn/create-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${quiz.subject} - Review`,
          subjectDescription: description,
          curriculum,
          sessionId,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || "Failed to create course");
      }

      const data = await createResponse.json();
      router.push(data.redirectUrl);
    } catch (err) {
      console.error("Error creating course:", err);
      setError(err instanceof Error ? err.message : "Failed to create study plan");
      setIsCreatingCourse(false);
    }
  };

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <Image src="/logo.png" alt="Krokyo" width={40} height={40} className="rounded-xl" />
          <span className="font-display text-xl font-bold text-stone-900 tracking-tight group-hover:text-teal-700 transition-colors">
            Krokyo
          </span>
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Phase indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[
            { num: 1, label: "Setup", phase: "setup" as const },
            { num: 2, label: "Quiz", phase: "quiz" as const },
            { num: 3, label: "Results", phase: "results" as const },
          ].map((step, i, arr) => (
            <div key={step.phase} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    phase === step.phase
                      ? "bg-primary-gradient text-white"
                      : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {step.num}
                </div>
                <span className={`text-xs ${phase === step.phase ? "text-teal-700 font-medium" : "text-stone-400"}`}>
                  {step.label}
                </span>
              </div>
              {i < arr.length - 1 && <div className="w-8 h-0.5 bg-stone-200 mb-5" />}
            </div>
          ))}
        </div>

        {/* Setup Phase */}
        {phase === "setup" && (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-soft-md overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100">
              <h1 className="font-display text-xl font-bold text-stone-900 tracking-tight">
                Practice Quiz
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                Enter your exam name or paste your curriculum
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Single input for exam/curriculum */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  What do you want to practice?
                </label>
                <textarea
                  value={examInput}
                  onChange={(e) => setExamInput(e.target.value)}
                  placeholder="Type your exam name (e.g., &quot;STAT 101 Final&quot;) or paste your syllabus/curriculum..."
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 text-sm bg-stone-50 transition-all resize-none"
                  rows={5}
                  autoFocus
                />

                {/* PDF Upload */}
                <div className="mt-3 flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtractingPdf}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isExtractingPdf ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Extracting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload PDF
                      </>
                    )}
                  </button>
                  {uploadedFile && (
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {uploadedFile.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Question count */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Number of questions
                </label>
                <div className="flex gap-3">
                  {([5, 10, 15] as const).map((count) => (
                    <button
                      key={count}
                      onClick={() => setQuestionCount(count)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                        questionCount === count
                          ? "bg-teal-50 border-teal-300 text-teal-700"
                          : "bg-white border-stone-200 text-stone-600 hover:border-teal-300"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Start button */}
              <button
                onClick={handleStartQuiz}
                disabled={!examInput.trim() || isGenerating}
                className="w-full py-4 bg-primary-gradient text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating questions...
                  </>
                ) : (
                  <>
                    Start Quiz
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Quiz Phase */}
        {phase === "quiz" && quiz && currentQuestion && (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-soft-md overflow-hidden">
            {/* Progress */}
            <div className="px-6 py-4 border-b border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <h1 className="font-display text-lg font-bold text-stone-900 tracking-tight">
                  {quiz.subject}
                </h1>
                <span className="text-sm text-stone-500">
                  {currentQuestionIndex + 1} / {quiz.questions.length}
                </span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2">
                <div
                  className="bg-primary-gradient h-2 rounded-full transition-all"
                  style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    currentQuestion.difficulty === "easy"
                      ? "bg-green-100 text-green-700"
                      : currentQuestion.difficulty === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {currentQuestion.difficulty}
                </span>
                <span className="text-xs text-stone-500">{currentQuestion.topic}</span>
              </div>

              <p className="text-lg text-stone-900 mb-6 leading-relaxed">
                {currentQuestion.question}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedOption === index;

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectOption(index)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-teal-50 border-teal-400 ring-2 ring-teal-400/20"
                          : "bg-white border-stone-200 hover:border-teal-300 hover:bg-teal-50/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold ${
                            isSelected
                              ? "bg-teal-600 text-white"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {optionLabels[index]}
                        </span>
                        <span className="text-sm text-stone-800 pt-0.5">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={selectedOption === null}
                  className="px-6 py-2.5 bg-primary-gradient text-white font-medium rounded-xl disabled:opacity-40 transition-all hover:shadow-lg disabled:hover:shadow-none flex items-center gap-2"
                >
                  {currentQuestionIndex < quiz.questions.length - 1 ? "Next" : "Finish"}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Phase */}
        {phase === "results" && results && quiz && (
          <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-soft-md text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#E7E5E4" strokeWidth="8" fill="none" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(results.correctCount / results.totalQuestions) * 251.2} 251.2`}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0F766E" />
                      <stop offset="100%" stopColor="#14B8A6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-2xl font-bold text-stone-900">
                    {Math.round((results.correctCount / results.totalQuestions) * 100)}%
                  </span>
                </div>
              </div>

              <h1 className="font-display text-2xl font-bold text-stone-900 mb-2 tracking-tight">
                {results.correctCount >= results.totalQuestions * 0.8
                  ? "Great job!"
                  : results.correctCount >= results.totalQuestions * 0.6
                  ? "Good progress!"
                  : results.correctCount >= results.totalQuestions * 0.4
                  ? "Keep studying!"
                  : "Needs more review"}
              </h1>
              <p className="text-stone-600">
                {results.correctCount} out of {results.totalQuestions} correct
              </p>
            </div>

            {/* Topic Breakdown */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-soft-md">
              <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">
                Topics to Review
              </h2>
              <div className="space-y-3">
                {results.topicBreakdown.map((topic) => {
                  const percentage = (topic.correct / topic.total) * 100;
                  const passed = percentage >= 50;

                  return (
                    <div key={topic.topic} className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {passed ? (
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-stone-900 truncate">{topic.topic}</span>
                          <span className="text-sm text-stone-500">{topic.correct}/{topic.total}</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${passed ? "bg-green-500" : "bg-red-500"}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Review */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-soft-md">
              <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">
                Review Your Answers
              </h2>
              <div className="space-y-4">
                {quiz.questions.map((question, index) => {
                  const answer = answers[index];
                  if (!answer) return null;

                  return (
                    <div
                      key={question.id}
                      className={`p-4 rounded-xl border ${
                        answer.isCorrect
                          ? "bg-green-50/50 border-green-200"
                          : "bg-red-50/50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {answer.isCorrect ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-900 mb-2">
                            {question.question}
                          </p>
                          <div className="text-sm text-stone-600 space-y-1">
                            <p>
                              <span className="text-stone-500">Your answer:</span>{" "}
                              <span className={answer.isCorrect ? "text-green-700" : "text-red-700"}>
                                {optionLabels[answer.selectedIndex]}. {question.options[answer.selectedIndex]}
                              </span>
                            </p>
                            {!answer.isCorrect && (
                              <p>
                                <span className="text-stone-500">Correct answer:</span>{" "}
                                <span className="text-green-700">
                                  {optionLabels[question.correctIndex]}. {question.options[question.correctIndex]}
                                </span>
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-2">
                            {question.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {results.failedTopics.length > 0 && (
                <button
                  onClick={handleStudyWeakAreas}
                  disabled={isCreatingCourse}
                  className="w-full py-4 bg-primary-gradient text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
                >
                  {isCreatingCourse ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating study plan...
                    </>
                  ) : (
                    <>
                      Study Weak Topics
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 py-3 bg-stone-100 text-stone-700 font-medium rounded-xl text-center hover:bg-stone-200 transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href="/"
                  className="flex-1 py-3 border border-stone-200 text-stone-700 font-medium rounded-xl text-center hover:bg-stone-50 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
