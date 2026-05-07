"use client";

import { useState, useEffect } from "react";

type Flashcard = {
  id: string;
  front: string;
  back: string;
  type: "definition" | "concept" | "application";
};

type FlashcardsProps = {
  topicName: string;
  topicId?: string;
  courseContext?: string;
  onClose: () => void;
};

export default function Flashcards({
  topicName,
  topicId,
  courseContext,
  onClose,
}: FlashcardsProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set());
  const [reviewCards, setReviewCards] = useState<Set<string>>(new Set());
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    generateFlashcards();
  }, [topicName]);

  const generateFlashcards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName, topicId, courseContext }),
      });
      const data = await response.json();
      if (data.flashcards) {
        setFlashcards(data.flashcards);
      }
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentCard = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  const handleSwipe = (direction: "left" | "right") => {
    if (!currentCard) return;

    setSwipeDirection(direction);

    if (direction === "right") {
      setKnownCards(prev => new Set(prev).add(currentCard.id));
    } else {
      setReviewCards(prev => new Set(prev).add(currentCard.id));
    }

    setTimeout(() => {
      setSwipeDirection(null);
      setIsFlipped(false);
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      setIsFlipped(!isFlipped);
    } else if (e.key === "ArrowRight") {
      handleSwipe("right");
    } else if (e.key === "ArrowLeft") {
      handleSwipe("left");
    }
  };

  const isComplete = currentIndex >= flashcards.length - 1 && (knownCards.has(currentCard?.id) || reviewCards.has(currentCard?.id));

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Generating flashcards for {topicName}...</p>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <p className="text-stone-600 mb-4">Could not generate flashcards.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 rounded-lg hover:bg-stone-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-stone-900">{topicName}</h2>
            <p className="text-sm text-stone-500">
              {currentIndex + 1} of {flashcards.length} cards
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-stone-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card */}
        {isComplete ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-stone-900 mb-2">Nice work!</h3>
            <p className="text-stone-600 mb-6">
              You got <span className="text-teal-600 font-semibold">{knownCards.size}</span> cards right
              {reviewCards.size > 0 && (
                <> and <span className="text-amber-600 font-semibold">{reviewCards.size}</span> to review</>
              )}
            </p>
            <div className="flex gap-3 justify-center">
              {reviewCards.size > 0 && (
                <button
                  onClick={() => {
                    const reviewArray = flashcards.filter(c => reviewCards.has(c.id));
                    setFlashcards(reviewArray);
                    setCurrentIndex(0);
                    setKnownCards(new Set());
                    setReviewCards(new Set());
                  }}
                  className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  Review missed ({reviewCards.size})
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`relative h-64 cursor-pointer perspective-1000 ${
                swipeDirection === "right" ? "animate-swipe-right" :
                swipeDirection === "left" ? "animate-swipe-left" : ""
              }`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div
                className={`absolute inset-0 transition-transform duration-500 transform-style-preserve-3d ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
              >
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 flex flex-col items-center justify-center border border-teal-200">
                  <span className={`text-xs uppercase tracking-wide mb-3 px-2 py-1 rounded-full ${
                    currentCard?.type === "definition" ? "bg-blue-100 text-blue-600" :
                    currentCard?.type === "concept" ? "bg-purple-100 text-purple-600" :
                    "bg-amber-100 text-amber-600"
                  }`}>
                    {currentCard?.type}
                  </span>
                  <p className="text-lg text-stone-800 text-center font-medium">
                    {currentCard?.front}
                  </p>
                  <p className="text-xs text-stone-400 mt-4">Tap to flip</p>
                </div>

                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-xl p-6 flex items-center justify-center border border-stone-200 shadow-sm">
                  <p className="text-stone-700 text-center leading-relaxed">
                    {currentCard?.back}
                  </p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => handleSwipe("left")}
                className="flex items-center gap-2 px-5 py-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Review later
              </button>
              <button
                onClick={() => handleSwipe("right")}
                className="flex items-center gap-2 px-5 py-3 bg-teal-50 text-teal-600 rounded-xl hover:bg-teal-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Got it!
              </button>
            </div>

            <p className="text-center text-xs text-stone-400 mt-4">
              Use arrow keys or swipe • Space to flip
            </p>
          </>
        )}

        {/* Score */}
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-stone-100">
          <div className="text-center">
            <p className="text-lg font-semibold text-teal-600">{knownCards.size}</p>
            <p className="text-xs text-stone-400">Known</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-600">{reviewCards.size}</p>
            <p className="text-xs text-stone-400">To review</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes swipe-right {
          to {
            transform: translateX(150%) rotate(20deg);
            opacity: 0;
          }
        }
        @keyframes swipe-left {
          to {
            transform: translateX(-150%) rotate(-20deg);
            opacity: 0;
          }
        }
        .animate-swipe-right {
          animation: swipe-right 0.3s ease-out forwards;
        }
        .animate-swipe-left {
          animation: swipe-left 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
