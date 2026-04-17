"use client";

interface Objective {
  id: string;
  objective: string;
  checkMethod: "conversational" | "quiz_mcq" | "quiz_free_text";
  difficulty: "core" | "advanced";
  status: "not_started" | "attempted" | "passed" | "failed";
}

interface ObjectiveProgressProps {
  topicName: string;
  objectives: Objective[];
  onStartQuiz?: () => void;
  compact?: boolean; // For sidebar layout
}

export default function ObjectiveProgress({
  topicName,
  objectives,
  onStartQuiz,
  compact = false,
}: ObjectiveProgressProps) {
  const coreObjectives = objectives.filter((o) => o.difficulty === "core");
  const advancedObjectives = objectives.filter((o) => o.difficulty === "advanced");

  // Don't render if no core objectives
  if (coreObjectives.length === 0) {
    return null;
  }

  const conversationalCore = coreObjectives.filter(
    (o) => o.checkMethod === "conversational"
  );
  const quizCore = coreObjectives.filter(
    (o) => o.checkMethod !== "conversational"
  );

  const passedConversational = conversationalCore.filter(
    (o) => o.status === "passed"
  ).length;
  const passedQuiz = quizCore.filter((o) => o.status === "passed").length;

  const allConversationalPassed =
    passedConversational === conversationalCore.length &&
    conversationalCore.length > 0;

  const showQuizPrompt =
    allConversationalPassed && quizCore.length > 0 && passedQuiz < quizCore.length;

  const allCorePassed =
    coreObjectives.filter((o) => o.status === "passed").length ===
      coreObjectives.length && coreObjectives.length > 0;

  const passedCount = coreObjectives.filter((o) => o.status === "passed").length;
  const progressPercent = coreObjectives.length > 0
    ? (passedCount / coreObjectives.length) * 100
    : 0;

  // Compact mode for sidebar
  if (compact) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-stone-600 truncate flex-1 mr-2">
            {topicName}
          </span>
          {allCorePassed ? (
            <span className="text-teal-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </span>
          ) : (
            <span className="text-xs text-stone-400">
              {passedCount}/{coreObjectives.length}
            </span>
          )}
        </div>

        {/* Compact progress bar */}
        <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Compact objective list */}
        <div className="mt-2 space-y-1">
          {coreObjectives.map((obj) => (
            <CompactObjectiveItem key={obj.id} objective={obj} />
          ))}
        </div>

        {/* Quiz button */}
        {showQuizPrompt && onStartQuiz && (
          <button
            onClick={onStartQuiz}
            className="mt-3 w-full py-1.5 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 transition-colors"
          >
            Take Quiz
          </button>
        )}
      </div>
    );
  }

  // Full mode (original)
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-soft-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-stone-800 text-sm">{topicName}</h3>
        {allCorePassed && (
          <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
            Complete
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
          <span>Progress</span>
          <span>
            {passedCount} / {coreObjectives.length} core objectives
          </span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-gradient transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Objectives list */}
      <div className="space-y-2">
        {coreObjectives.map((obj) => (
          <ObjectiveItem key={obj.id} objective={obj} />
        ))}

        {advancedObjectives.length > 0 && (
          <>
            <div className="text-xs text-stone-400 mt-3 mb-1">
              Advanced (optional)
            </div>
            {advancedObjectives.map((obj) => (
              <ObjectiveItem key={obj.id} objective={obj} />
            ))}
          </>
        )}
      </div>

      {/* Quiz prompt */}
      {showQuizPrompt && onStartQuiz && (
        <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm text-teal-800 mb-2">
            Ready for a quiz to confirm your understanding?
          </p>
          <button
            onClick={onStartQuiz}
            className="w-full py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Start Quiz
          </button>
        </div>
      )}
    </div>
  );
}

// Compact version for sidebar
function CompactObjectiveItem({ objective }: { objective: Objective }) {
  const statusStyles = {
    passed: "text-teal-600",
    failed: "text-red-500",
    attempted: "text-amber-500",
    not_started: "text-stone-300",
  };

  const statusIcons = {
    passed: "✓",
    failed: "✗",
    attempted: "◐",
    not_started: "○",
  };

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`flex-shrink-0 ${statusStyles[objective.status]}`}>
        {statusIcons[objective.status]}
      </span>
      <span
        className={`truncate ${
          objective.status === "passed" ? "text-stone-400 line-through" : "text-stone-600"
        }`}
        title={objective.objective}
      >
        {objective.objective}
      </span>
    </div>
  );
}

function ObjectiveItem({ objective }: { objective: Objective }) {
  const statusStyles = {
    passed: "bg-teal-500 text-white",
    failed: "bg-red-500 text-white",
    attempted: "bg-amber-500 text-white",
    not_started: "bg-stone-200 text-stone-500",
  };

  const statusIcons = {
    passed: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
    failed: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    attempted: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
      </svg>
    ),
    not_started: null,
  };

  const methodLabel = {
    conversational: "Chat",
    quiz_mcq: "Quiz",
    quiz_free_text: "Quiz",
  };

  return (
    <div className="flex items-start gap-2">
      <span
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
          statusStyles[objective.status]
        }`}
      >
        {statusIcons[objective.status]}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            objective.status === "passed" ? "text-stone-500" : "text-stone-700"
          }`}
        >
          {objective.objective}
        </p>
        <span className="text-xs text-stone-400">
          {methodLabel[objective.checkMethod]}
        </span>
      </div>
    </div>
  );
}
