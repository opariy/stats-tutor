"use client";

import type { LearningMetrics as LearningMetricsType } from "@/lib/admin-metrics";

type ThresholdLevel = "good" | "warning" | "bad" | "neutral";

function getCompletionLevel(pct: number): ThresholdLevel {
  if (pct >= 50) return "good";
  if (pct >= 25) return "warning";
  if (pct > 0) return "bad";
  return "neutral";
}

function getAbandonmentLevel(pct: number): ThresholdLevel {
  if (pct <= 20) return "good";
  if (pct <= 40) return "warning";
  if (pct > 0) return "bad";
  return "neutral";
}

const levelColors = {
  good: "text-emerald-600",
  warning: "text-amber-600",
  bad: "text-red-500",
  neutral: "text-stone-900",
};

export default function LearningMetrics({ metrics }: { metrics: LearningMetricsType }) {
  const completionLevel = getCompletionLevel(metrics.completionRate);
  const abandonmentLevel = getAbandonmentLevel(metrics.abandonmentRate);

  // Calculate overall health score (0-10)
  const completionScore = completionLevel === "good" ? 5 : completionLevel === "warning" ? 2.5 : 0;
  const abandonmentScore = abandonmentLevel === "good" ? 5 : abandonmentLevel === "warning" ? 2.5 : 0;
  const healthScore = completionScore + abandonmentScore;
  const healthLevel: ThresholdLevel =
    healthScore >= 8 ? "good" : healthScore >= 5 ? "warning" : metrics.topicsStarted > 0 ? "bad" : "neutral";

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg font-semibold text-stone-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Learning Metrics
        </h2>
        {metrics.topicsStarted > 0 && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            healthLevel === "good" ? "bg-emerald-100 text-emerald-700" :
            healthLevel === "warning" ? "bg-amber-100 text-amber-700" :
            healthLevel === "bad" ? "bg-red-100 text-red-700" :
            "bg-stone-100 text-stone-700"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              healthLevel === "good" ? "bg-emerald-500" :
              healthLevel === "warning" ? "bg-amber-500" :
              healthLevel === "bad" ? "bg-red-500" :
              "bg-stone-500"
            }`} />
            {healthScore.toFixed(1)}/10
          </div>
        )}
      </div>

      {metrics.topicsStarted > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Topics Started</p>
              <p className="text-2xl font-bold text-stone-900">
                {metrics.topicsStarted}
              </p>
              <p className="text-xs text-stone-400">unique topics studied</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Topics Mastered</p>
              <p className="text-2xl font-bold text-emerald-600">
                {metrics.topicsMastered}
              </p>
              <p className="text-xs text-stone-400">declared understood</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Completion Rate</p>
              <p className={`text-2xl font-bold ${levelColors[completionLevel]}`}>
                {metrics.completionRate}%
              </p>
              <p className="text-xs text-stone-400">mastered / started</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Time to Master</p>
              <p className="text-2xl font-bold text-stone-900">
                {metrics.avgTimeToMastery > 0 ? `${metrics.avgTimeToMastery.toFixed(0)}m` : "—"}
              </p>
              <p className="text-xs text-stone-400">minutes to mastery</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Abandonment</p>
              <p className={`text-2xl font-bold ${levelColors[abandonmentLevel]}`}>
                {metrics.abandonmentRate}%
              </p>
              <p className="text-xs text-stone-400">inactive &gt;7 days</p>
            </div>
          </div>

          {metrics.topTopics.length > 0 && (
            <div>
              <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-3">Top Topics</p>
              <div className="flex flex-wrap gap-2">
                {metrics.topTopics.map((topic) => (
                  <span
                    key={topic.topicId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-lg text-sm"
                  >
                    <span className="font-medium text-stone-700">{topic.topicId}</span>
                    <span className="text-stone-400">({topic.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-stone-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-stone-500 text-sm">No topic-specific learning data yet</p>
          <p className="text-stone-400 text-xs mt-1">Learning metrics will appear when users study specific topics</p>
        </div>
      )}
    </div>
  );
}
