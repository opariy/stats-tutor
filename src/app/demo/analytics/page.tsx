import Link from "next/link";
import Image from "next/image";
import { MasteryTable } from "./mastery-table";
import { ReviewSessionButton } from "./review-session-modal";

export const metadata = {
  title: "Demo Analytics | Krokyo Stats Tutor",
  description: "Demo analytics dashboard showing sample class metrics",
};

// Dummy data - no database queries
const DUMMY_DATA = {
  totalStudents: 47,
  activeStudents: 33,  // 70%
  passiveStudents: 14, // 30%

  weeklyQuestionsSummary: [
    "Many students confused about when to use t-test vs z-test",
    "Questions about interpreting p-values and significance levels",
    "Difficulty setting up null and alternative hypotheses",
    "Confusion about one-tailed vs two-tailed tests",
    "Unclear on how sample size affects standard error",
    "Struggling with Type I vs Type II error trade-offs",
    "Questions about when to reject the null hypothesis",
    "Confusion about degrees of freedom in t-tests",
    "Difficulty calculating confidence intervals by hand",
    "Unsure how to interpret overlapping confidence intervals",
    "Questions about assumptions required for hypothesis tests",
    "Struggling with the difference between statistical and practical significance",
  ],

  topTopics: [
    { name: "Hypothesis Testing Basics", studentCount: 28, chapter: 9 },
    { name: "t-test vs z-test", studentCount: 14, chapter: 9 },
    { name: "P-values and Significance", studentCount: 31, chapter: 9 },
    { name: "Confidence Intervals", studentCount: 22, chapter: 8 },
    { name: "Type I and Type II Errors", studentCount: 9, chapter: 9 },
    { name: "Normal Distribution", studentCount: 25, chapter: 4 },
    { name: "Central Limit Theorem", studentCount: 11, chapter: 7 },
    { name: "Sample Size Determination", studentCount: 19, chapter: 8 },
    { name: "Chi-Square Tests", studentCount: 16, chapter: 9 },
    { name: "Binomial Distribution", studentCount: 13, chapter: 3 },
  ],

  stuckPoints: [
    {
      count: 14,
      issue: "Interpreting p-value as P(H₀ is true)",
      intervention: "Quick poll: 'What does p=0.03 mean?' then show the 3 common wrong answers before the correct frequentist definition.",
    },
    {
      count: 11,
      issue: "Using z-test when σ is unknown",
      intervention: "Draw the decision tree on the board: 'Do you know σ?' → No → t-test. Takes 90 seconds.",
    },
    {
      count: 9,
      issue: "Confusing CI interpretation (95% chance μ is in interval)",
      intervention: "Simulate 20 CIs live in R/Excel. Show ~19 contain μ. 'The interval is random, not μ.'",
    },
    {
      count: 8,
      issue: "Rejecting H₀ when p > α",
      intervention: "Show an underpowered study where a real effect exists but p > α. Ask: 'Is H₀ true here?' Students see that failing to reject ≠ accepting H₀, it means insufficient evidence.",
    },
    {
      count: 7,
      issue: "Swapping Type I and Type II error definitions",
      intervention: "Use the courtroom analogy: Type I = convicting innocent (α), Type II = freeing guilty (β).",
    },
  ],

  misconceptions: [
    {
      topic: "Hypothesis Testing",
      misconceptions: [
        { text: "Thinks p-value is probability H₀ is true", percent: 67 },
        { text: "Confuses α with p-value", percent: 45 },
        { text: "Rejects H₀ when p > α", percent: 28 },
      ],
    },
    {
      topic: "t-test vs z-test",
      misconceptions: [
        { text: "Uses z-test when σ unknown", percent: 58 },
        { text: "Ignores sample size threshold", percent: 42 },
        { text: "Applies z-test to small samples", percent: 31 },
      ],
    },
    {
      topic: "Confidence Intervals",
      misconceptions: [
        { text: "Thinks 95% CI means 95% chance μ is in interval", percent: 71 },
        { text: "Confuses CI width with confidence level", percent: 38 },
        { text: "Ignores sample size effect on width", percent: 25 },
      ],
    },
    {
      topic: "Type I & II Errors",
      misconceptions: [
        { text: "Swaps Type I and Type II definitions", percent: 52 },
        { text: "Thinks reducing α always better", percent: 44 },
        { text: "Ignores power in study design", percent: 36 },
      ],
    },
    {
      topic: "Central Limit Theorem",
      misconceptions: [
        { text: "Thinks CLT applies to any sample size", percent: 48 },
        { text: "Confuses σ with σ/√n", percent: 55 },
        { text: "Applies CLT to non-independent samples", percent: 22 },
      ],
    },
    {
      topic: "Normal Distribution",
      misconceptions: [
        { text: "Assumes all data is normally distributed", percent: 41 },
        { text: "Misreads z-score direction", percent: 33 },
        { text: "Forgets to standardize before lookup", percent: 29 },
      ],
    },
  ],
};

export default function DemoAnalyticsPage() {
  const activePercent = Math.round((DUMMY_DATA.activeStudents / DUMMY_DATA.totalStudents) * 100);

  // Calculate days until exam (May 7, 2026)
  const examDate = new Date(2026, 4, 7); // May is month 4 (0-indexed)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header with engagement stat */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/demo" className="flex items-center gap-3 group">
              <Image
                src="/logo.png"
                alt="Krokyo"
                width={40}
                height={40}
                className="rounded-xl"
                style={{ width: 'auto', height: 'auto' }}
              />
              <div>
                <h1 className="font-display text-lg font-bold text-stone-900 tracking-tight group-hover:text-teal-700 transition-colors">
                  Professor Dashboard
                </h1>
                <p className="text-xs text-stone-500">Demo Analytics</p>
              </div>
            </Link>
            {/* Engagement stat in header */}
            <div className="hidden sm:flex items-center gap-2 pl-6 border-l border-stone-200">
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e7e5e4" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#0f766e" strokeWidth="4" strokeDasharray={`${activePercent * 0.88} 100`} strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-xs">
                <span className="text-teal-700 font-semibold">{DUMMY_DATA.activeStudents}/{DUMMY_DATA.totalStudents}</span>
                <span className="text-stone-400 ml-1">active</span>
              </div>
            </div>
          </div>
          <Link
            href="/demo"
            className="text-sm text-stone-500 hover:text-stone-700 px-2 py-2"
          >
            ← Back to Demo Chats
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Row 1: Hero - Misconception Heatmap */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Misconception Heatmap</h2>
              <p className="text-sm text-stone-500 mt-1">Top 3 misconceptions per topic, shaded by % of students</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-stone-400">
              {[
                { label: "0%", color: "bg-rose-100" },
                { label: "20%", color: "bg-rose-200" },
                { label: "40%", color: "bg-rose-300" },
                { label: "60%", color: "bg-rose-400" },
                { label: "70%+", color: "bg-rose-500" },
              ].map((stop, i, arr) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-8 h-3 ${stop.color} ${i === 0 ? "rounded-l" : ""} ${i === arr.length - 1 ? "rounded-r" : ""}`} />
                  <span className="mt-1 text-[10px]">{stop.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left text-xs font-medium text-stone-500 pb-3 pr-4 w-40">Topic</th>
                  <th className="text-left text-xs font-medium text-stone-500 pb-3 px-2">Misconception 1</th>
                  <th className="text-left text-xs font-medium text-stone-500 pb-3 px-2">Misconception 2</th>
                  <th className="text-left text-xs font-medium text-stone-500 pb-3 px-2">Misconception 3</th>
                </tr>
              </thead>
              <tbody>
                {DUMMY_DATA.misconceptions.map((row, i) => (
                  <tr key={i} className="border-b border-stone-50 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-stone-700">{row.topic}</span>
                    </td>
                    {row.misconceptions.map((m, j) => {
                      const intensity = m.percent >= 60 ? 'bg-rose-500 text-white' :
                                       m.percent >= 45 ? 'bg-rose-400 text-white' :
                                       m.percent >= 30 ? 'bg-rose-300 text-stone-800' :
                                       m.percent >= 15 ? 'bg-rose-200 text-stone-700' :
                                       'bg-rose-100 text-stone-600';
                      return (
                        <td key={j} className="py-3 px-2">
                          <div className={`rounded-lg p-3 ${intensity}`}>
                            <div className="text-xs leading-snug">{m.text}</div>
                            <div className="text-xs font-bold mt-1">{m.percent}%</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 2: Pre-exam Reasoning Gap Alert - full width */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="flex">
            {/* Amber accent bar */}
            <div className="w-1 bg-amber-500 flex-shrink-0" />

            <div className="flex-1 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Left: Days countdown */}
                <div className="flex-shrink-0 text-center lg:text-left">
                  <div className="text-5xl font-bold text-amber-600">{daysUntilExam}</div>
                  <div className="text-xs text-stone-500 mt-1">{daysUntilExam === 1 ? "day" : "days"} to exam</div>
                </div>

                {/* Middle: Gap description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-800 leading-relaxed">
                    <span className="font-semibold text-amber-700">38%</span> of students have not yet demonstrated reliable reasoning on hypothesis testing.
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    <span className="font-medium">Top gap:</span> interpreting p-value as P(H₀ is true), affecting 67% of the cohort
                  </p>
                </div>

                {/* Right: At-risk students */}
                <div className="flex-shrink-0">
                  <p className="text-xs text-stone-500 font-medium mb-2">At-risk students</p>
                  <div className="flex flex-wrap gap-1">
                    {["Taylor K.", "Jamie L.", "Avery B.", "Alex C."].map((name) => (
                      <span key={name} className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom-right: Generate button */}
              <div className="flex justify-end mt-4 pt-4 border-t border-stone-100">
                <ReviewSessionButton daysUntilExam={daysUntilExam} />
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Stuck Points (1 col) + Students Needing Attention (2 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Stuck Points - the "so what on Tuesday" tile */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-medium text-stone-500">Top Stuck Points</h2>
                <p className="text-xs text-stone-400 mt-0.5">2-min interventions</p>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                Action items
              </span>
            </div>

            <div className="space-y-3">
              {DUMMY_DATA.stuckPoints.map((point, i) => (
                <div key={i} className="border border-stone-100 rounded-xl p-3 hover:border-stone-200 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center text-xs font-bold">
                      {point.count}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-800 leading-snug">
                        {point.issue}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">{point.intervention}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-stone-400 mt-4">
              Based on 33 active students this week. Students may appear in multiple stuck points.
            </p>
          </div>

          {/* Students Needing Attention Table - 2 cols */}
          <div className="lg:col-span-2">
            <MasteryTable />
          </div>
        </div>

      </main>
    </div>
  );
}
