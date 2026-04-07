import type { ClassHealth } from "@/lib/professor-metrics";

interface ClassHealthCardProps {
  classHealth: ClassHealth;
}

export default function ClassHealthCard({ classHealth }: ClassHealthCardProps) {
  const {
    totalStudents,
    avgTopicsMastered,
    healthyCount,
    atRiskCount,
    stuckCount,
    notStartedCount,
    engagementTrend,
  } = classHealth;

  return (
    <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg font-semibold text-stone-900">Class Health</h2>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          engagementTrend === "up"
            ? "bg-green-50 text-green-700"
            : engagementTrend === "down"
            ? "bg-red-50 text-red-700"
            : "bg-stone-100 text-stone-600"
        }`}>
          {engagementTrend === "up" && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
          {engagementTrend === "down" && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
          {engagementTrend === "stable" && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          )}
          {engagementTrend === "up" ? "Trending Up" : engagementTrend === "down" ? "Trending Down" : "Stable"}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Total Students */}
        <div className="bg-stone-50 rounded-lg p-4">
          <p className="text-sm text-stone-500 mb-1">Total Students</p>
          <p className="text-2xl font-bold text-stone-900">{totalStudents}</p>
        </div>

        {/* Avg Topics Mastered */}
        <div className="bg-stone-50 rounded-lg p-4">
          <p className="text-sm text-stone-500 mb-1">Avg Mastered</p>
          <p className="text-2xl font-bold text-stone-900">{avgTopicsMastered} <span className="text-sm font-normal text-stone-500">topics</span></p>
        </div>

        {/* Health Distribution */}
        <div className="bg-stone-50 rounded-lg p-4">
          <p className="text-sm text-stone-500 mb-2">Health Status</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-stone-700">{healthyCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-sm font-medium text-stone-700">{atRiskCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-sm font-medium text-stone-700">{stuckCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-stone-400"></span>
              <span className="text-sm font-medium text-stone-700">{notStartedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Bar */}
      {totalStudents > 0 && (
        <div className="mt-4">
          <div className="flex h-2 rounded-full overflow-hidden bg-stone-200">
            <div
              className="bg-green-500"
              style={{ width: `${(healthyCount / totalStudents) * 100}%` }}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${(atRiskCount / totalStudents) * 100}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${(stuckCount / totalStudents) * 100}%` }}
            />
            <div
              className="bg-stone-400"
              style={{ width: `${(notStartedCount / totalStudents) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-stone-500">
            <span>Healthy</span>
            <span>At Risk</span>
            <span>Stuck</span>
            <span>Not Started</span>
          </div>
        </div>
      )}
    </div>
  );
}
