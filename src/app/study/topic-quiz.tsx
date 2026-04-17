"use client";

import { useState } from "react";

interface QuizQuestion {
  objectiveId: string;
  question: string;
  type: "mcq" | "free_text";
  options?: string[];
}

interface QuizResult {
  objectiveId: string;
  isCorrect: boolean;
  explanation?: string;
}

interface TopicQuizProps {
  quizId: string;
  topicName: string;
  questions: QuizQuestion[];
  sessionId: string;
  onComplete: (passed: boolean, score: number) => void;
  onClose: () => void;
}

export default function TopicQuiz({
  quizId,
  topicName,
  questions,
  sessionId,
  onComplete,
  onClose,
}: TopicQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    passed: boolean;
    results: QuizResult[];
    message: string;
  } | null>(null);
  const [showingResults, setShowingResults] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const handleAnswerChange = (objectiveId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [objectiveId]: answer }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          quizId,
          answers: Object.entries(answers).map(([objectiveId, answer]) => ({
            objectiveId,
            answer,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit quiz");
      }

      const data = await response.json();
      setResults(data);
      setShowingResults(true);
    } catch (error) {
      console.error("Quiz submission error:", error);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (results) {
      onComplete(results.passed, results.score);
    }
  };

  // Results view
  if (showingResults && results) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-stone-200">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-stone-900">
                Quiz Results
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Score display */}
            <div className="text-center">
              <div
                className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${
                  results.passed
                    ? "bg-teal-100 text-teal-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {results.score}%
              </div>
              <p
                className={`mt-4 text-lg font-medium ${
                  results.passed ? "text-teal-700" : "text-amber-700"
                }`}
              >
                {results.passed ? "You Passed!" : "Keep Learning"}
              </p>
              <p className="mt-2 text-sm text-stone-500">{results.message}</p>
            </div>

            {/* Individual results */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-stone-700">Question Results</h3>
              {results.results.map((result, i) => {
                const question = questions.find(
                  (q) => q.objectiveId === result.objectiveId
                );
                return (
                  <div
                    key={result.objectiveId}
                    className={`p-4 rounded-xl border ${
                      result.isCorrect
                        ? "bg-teal-50 border-teal-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                          result.isCorrect ? "bg-teal-500" : "bg-red-500"
                        }`}
                      >
                        {result.isCorrect ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-stone-700">
                          Q{i + 1}: {question?.question.slice(0, 50)}...
                        </p>
                        {result.explanation && (
                          <p className="text-xs text-stone-500 mt-1">
                            {result.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action button */}
            <button
              onClick={handleFinish}
              className={`w-full py-3 rounded-xl font-medium transition-colors ${
                results.passed
                  ? "bg-primary-gradient text-white hover:opacity-90"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {results.passed ? "Continue to Next Topic" : "Review and Retry"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz view
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="p-6 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900">
                {topicName} Quiz
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                Question {currentIndex + 1} of {totalQuestions}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-600 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-gradient transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="p-6">
          <p className="text-stone-800 font-medium mb-6">{currentQuestion.question}</p>

          {currentQuestion.type === "mcq" && currentQuestion.options ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, i) => {
                const letter = String.fromCharCode(65 + i); // A, B, C, D
                const isSelected = answers[currentQuestion.objectiveId] === letter;

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswerChange(currentQuestion.objectiveId, letter)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-teal-500 bg-teal-50"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isSelected
                            ? "bg-teal-500 text-white"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="text-stone-700">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answers[currentQuestion.objectiveId] || ""}
              onChange={(e) =>
                handleAnswerChange(currentQuestion.objectiveId, e.target.value)
              }
              placeholder="Type your answer here..."
              className="w-full h-32 p-4 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-stone-600 hover:text-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <span className="text-sm text-stone-500">
            {answeredCount} / {totalQuestions} answered
          </span>

          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={answeredCount < totalQuestions || isSubmitting}
              className="px-6 py-2 bg-primary-gradient text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Submitting..." : "Submit Quiz"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
