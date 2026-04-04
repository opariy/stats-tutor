"use client";

import type { ProductMetrics as ProductMetricsType } from "@/lib/admin-metrics";

type ThresholdLevel = "good" | "warning" | "bad" | "neutral";

function getRetentionLevel(pct: number): ThresholdLevel {
  if (pct >= 30) return "good";
  if (pct >= 15) return "warning";
  if (pct > 0) return "bad";
  return "neutral";
}

function getDropOffLevel(pct: number): ThresholdLevel {
  if (pct <= 50) return "good";
  if (pct <= 70) return "warning";
  return "bad";
}

function getBounceLevel(pct: number): ThresholdLevel {
  if (pct <= 20) return "good";
  if (pct <= 40) return "warning";
  return "bad";
}

function getFeedbackRateLevel(pct: number): ThresholdLevel {
  if (pct >= 20) return "good";
  if (pct >= 10) return "warning";
  return "neutral";
}

function getSatisfactionLevel(pct: number): ThresholdLevel {
  if (pct >= 70) return "good";
  if (pct >= 40) return "warning";
  if (pct > 0) return "bad";
  return "neutral";
}

const levelColors = {
  good: "text-emerald-600",
  warning: "text-amber-600",
  bad: "text-red-500",
  neutral: "text-stone-900",
};

export default function ProductMetrics({ metrics }: { metrics: ProductMetricsType }) {
  const retD1Level = getRetentionLevel(metrics.retentionD1);
  const retD7Level = getRetentionLevel(metrics.retentionD7);
  const dropOffLevel = getDropOffLevel(metrics.dropOffRate);
  const bounceLevel = getBounceLevel(metrics.bounceRate);
  const feedbackLevel = getFeedbackRateLevel(metrics.feedbackRate);
  const satisfactionLevel = getSatisfactionLevel(metrics.satisfactionRate);

  // Calculate overall health score (0-10)
  const scores = [
    retD1Level === "good" ? 1.5 : retD1Level === "warning" ? 0.75 : retD1Level === "neutral" ? 0 : 0,
    dropOffLevel === "good" ? 2 : dropOffLevel === "warning" ? 1 : 0,
    bounceLevel === "good" ? 2 : bounceLevel === "warning" ? 1 : 0,
    satisfactionLevel === "good" ? 2.5 : satisfactionLevel === "warning" ? 1.25 : 0,
    feedbackLevel === "good" ? 2 : feedbackLevel === "warning" ? 1 : 0,
  ];
  const healthScore = scores.reduce((a, b) => a + b, 0);
  const healthLevel: ThresholdLevel =
    healthScore >= 8 ? "good" : healthScore >= 5 ? "warning" : "bad";

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg font-semibold text-stone-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Product Metrics
        </h2>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          healthLevel === "good" ? "bg-emerald-100 text-emerald-700" :
          healthLevel === "warning" ? "bg-amber-100 text-amber-700" :
          "bg-red-100 text-red-700"
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            healthLevel === "good" ? "bg-emerald-500" :
            healthLevel === "warning" ? "bg-amber-500" :
            "bg-red-500"
          }`} />
          {healthScore.toFixed(1)}/10
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Total Sessions</p>
          <p className="text-2xl font-bold text-stone-900">
            {metrics.totalSessions}
          </p>
          <p className="text-xs text-stone-400">study sessions</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Session</p>
          <p className="text-2xl font-bold text-stone-900">
            {metrics.avgSessionDuration.toFixed(1)}m
          </p>
          <p className="text-xs text-stone-400">duration in minutes</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Msgs/Session</p>
          <p className="text-2xl font-bold text-stone-900">
            {metrics.avgMessagesPerSession.toFixed(1)}
          </p>
          <p className="text-xs text-stone-400">messages per session</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Total Time</p>
          <p className="text-2xl font-bold text-stone-900">
            {metrics.totalSessionTime > 60
              ? `${(metrics.totalSessionTime / 60).toFixed(1)}h`
              : `${metrics.totalSessionTime.toFixed(0)}m`}
          </p>
          <p className="text-xs text-stone-400">all sessions combined</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Retention D1</p>
          <p className={`text-2xl font-bold ${levelColors[retD1Level]}`}>
            {metrics.retentionD1}%
          </p>
          <p className="text-xs text-stone-400">returned next day</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Retention D7</p>
          <p className={`text-2xl font-bold ${levelColors[retD7Level]}`}>
            {metrics.retentionD7}%
          </p>
          <p className="text-xs text-stone-400">returned after 7 days</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Drop-off</p>
          <p className={`text-2xl font-bold ${levelColors[dropOffLevel]}`}>
            {metrics.dropOffRate}%
          </p>
          <p className="text-xs text-stone-400">single session users</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Bounce Rate</p>
          <p className={`text-2xl font-bold ${levelColors[bounceLevel]}`}>
            {metrics.bounceRate}%
          </p>
          <p className="text-xs text-stone-400">≤2 messages total</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Feedback Rate</p>
          <p className={`text-2xl font-bold ${levelColors[feedbackLevel]}`}>
            {metrics.feedbackRate}%
          </p>
          <p className="text-xs text-stone-400">responses with feedback</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Satisfaction</p>
          <p className={`text-2xl font-bold ${levelColors[satisfactionLevel]}`}>
            {metrics.satisfactionRate > 0 ? `${metrics.satisfactionRate}%` : "—"}
          </p>
          <p className="text-xs text-stone-400">thumbs up rate</p>
        </div>
      </div>
    </div>
  );
}
