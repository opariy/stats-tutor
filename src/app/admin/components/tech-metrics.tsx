"use client";

import type { TechMetrics as TechMetricsType } from "@/lib/admin-metrics";

type ThresholdLevel = "good" | "warning" | "bad";

function getReplyRateLevel(rate: number): ThresholdLevel {
  if (rate >= 95) return "good";
  if (rate >= 80) return "warning";
  return "bad";
}

function getResponseTimeLevel(ms: number): ThresholdLevel {
  if (ms < 5000) return "good";
  if (ms < 10000) return "warning";
  return "bad";
}

function getErrorRateLevel(rate: number): ThresholdLevel {
  if (rate <= 1) return "good";
  if (rate <= 5) return "warning";
  return "bad";
}

const levelColors = {
  good: "text-emerald-600",
  warning: "text-amber-600",
  bad: "text-red-500",
};

export default function TechMetrics({ metrics }: { metrics: TechMetricsType }) {
  const replyLevel = getReplyRateLevel(metrics.replyRate);
  const p95Level = getResponseTimeLevel(metrics.p95ResponseTime);
  const errorLevel = getErrorRateLevel(metrics.errorRate);

  // Calculate overall health score (0-10)
  const healthScore =
    (replyLevel === "good" ? 3.3 : replyLevel === "warning" ? 1.6 : 0) +
    (p95Level === "good" ? 3.3 : p95Level === "warning" ? 1.6 : 0) +
    (errorLevel === "good" ? 3.4 : errorLevel === "warning" ? 1.7 : 0);

  const healthLevel: ThresholdLevel =
    healthScore >= 8 ? "good" : healthScore >= 5 ? "warning" : "bad";

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-soft-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg font-semibold text-stone-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          Tech Metrics
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Reply Rate</p>
          <p className={`text-2xl font-bold ${levelColors[replyLevel]}`}>
            {metrics.replyRate}%
          </p>
          <p className="text-xs text-stone-400">% user msgs with response</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Avg Response</p>
          <p className="text-2xl font-bold text-stone-900">
            {metrics.avgResponseTime ? `${(metrics.avgResponseTime / 1000).toFixed(1)}s` : '—'}
          </p>
          <p className="text-xs text-stone-400">mean response time</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">P95 Response</p>
          <p className={`text-2xl font-bold ${levelColors[p95Level]}`}>
            {metrics.p95ResponseTime ? `${(metrics.p95ResponseTime / 1000).toFixed(1)}s` : '—'}
          </p>
          <p className="text-xs text-stone-400">95th percentile</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Min Response</p>
          <p className="text-2xl font-bold text-stone-900">
            {metrics.minResponseTime ? `${(metrics.minResponseTime / 1000).toFixed(1)}s` : '—'}
          </p>
          <p className="text-xs text-stone-400">fastest response</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Max Response</p>
          <p className="text-2xl font-bold text-stone-900">
            {metrics.maxResponseTime ? `${(metrics.maxResponseTime / 1000).toFixed(1)}s` : '—'}
          </p>
          <p className="text-xs text-stone-400">slowest response</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 uppercase font-semibold tracking-wider mb-1">Error Rate</p>
          <p className={`text-2xl font-bold ${levelColors[errorLevel]}`}>
            {metrics.errorRate}%
          </p>
          <p className="text-xs text-stone-400">{metrics.totalErrors24h} errors (24h)</p>
        </div>
      </div>
    </div>
  );
}
