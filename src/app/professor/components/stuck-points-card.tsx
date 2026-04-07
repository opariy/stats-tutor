"use client";

import { useState } from "react";
import type { StuckPoint } from "@/lib/professor-metrics";

interface StuckPointsCardProps {
  stuckPoints: StuckPoint[];
  courseId: string;
}

export default function StuckPointsCard({ stuckPoints, courseId }: StuckPointsCardProps) {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    stuckPoints.forEach((sp) => {
      if (sp.suggestion) {
        initial[sp.topicId] = sp.suggestion;
      }
    });
    return initial;
  });

  const fetchSuggestion = async (topicId: string) => {
    if (suggestions[topicId]) return;

    setLoadingSuggestion(topicId);
    try {
      const res = await fetch(`/api/professor/stuck-points?courseId=${courseId}&includeExcerpts=true`);
      const data = await res.json();
      const point = data.stuckPoints?.find((sp: StuckPoint) => sp.topicId === topicId);
      if (point?.suggestion) {
        setSuggestions((prev) => ({ ...prev, [topicId]: point.suggestion }));
      }
    } catch (error) {
      console.error("Failed to fetch suggestion:", error);
    } finally {
      setLoadingSuggestion(null);
    }
  };

  const toggleExpand = (topicId: string) => {
    if (expandedTopic === topicId) {
      setExpandedTopic(null);
    } else {
      setExpandedTopic(topicId);
      if (!suggestions[topicId]) {
        fetchSuggestion(topicId);
      }
    }
  };

  if (stuckPoints.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Top Stuck Points</h2>
        <div className="text-center py-8 text-stone-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No stuck points detected this week</p>
          <p className="text-sm mt-1">Students are progressing well</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-stone-900">Top Stuck Points</h2>
        <span className="text-xs text-stone-500">Last 7 days</span>
      </div>

      <div className="space-y-3">
        {stuckPoints.map((point, index) => (
          <div
            key={point.topicId}
            className="border border-stone-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(point.topicId)}
              className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-stone-900">{point.topicName}</p>
                  <p className="text-sm text-stone-500">
                    {point.studentCount} student{point.studentCount !== 1 ? "s" : ""} struggling
                    {point.avgStruggleTime > 0 && ` • Avg ${Math.round(point.avgStruggleTime)}min`}
                  </p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-stone-400 transition-transform ${
                  expandedTopic === point.topicId ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedTopic === point.topicId && (
              <div className="px-4 pb-4 border-t border-stone-100 bg-stone-50">
                <div className="pt-4">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">AI Suggestion</p>
                  {loadingSuggestion === point.topicId ? (
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating suggestion...
                    </div>
                  ) : suggestions[point.topicId] ? (
                    <p className="text-sm text-stone-700 bg-white p-3 rounded-lg border border-stone-200">
                      {suggestions[point.topicId]}
                    </p>
                  ) : (
                    <p className="text-sm text-stone-500 italic">
                      No suggestion available yet
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
