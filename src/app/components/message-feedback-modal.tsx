"use client";

import { useState } from "react";

interface MessageFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  rating: "up" | "down";
}

export default function MessageFeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  rating,
}: MessageFeedbackModalProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      onClose();
      return;
    }
    setSubmitting(true);
    await onSubmit(comment);
    setSubmitting(false);
    setComment("");
  };

  const handleClose = () => {
    onSubmit("");
    setComment("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Success indicator */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              rating === "up" ? "bg-teal-100" : "bg-amber-100"
            }`}
          >
            {rating === "up" ? (
              <svg
                className="w-5 h-5 text-teal-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-amber-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-stone-900">
              {rating === "up" ? "Thanks for the feedback!" : "Thanks for letting us know"}
            </h2>
            <p className="text-sm text-stone-500">
              {rating === "up" ? "Positive feedback recorded" : "Negative feedback recorded"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Want to tell us more? <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                rating === "up"
                  ? "What did you find helpful?"
                  : "How could we improve?"
              }
              rows={3}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-none"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || !comment.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-gradient hover:shadow-lg disabled:opacity-50 rounded-lg transition-all"
            >
              {submitting ? "Sending..." : "Add comment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
