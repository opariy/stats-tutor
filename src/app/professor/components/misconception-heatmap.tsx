import type { MisconceptionData } from "@/lib/professor-metrics";

interface MisconceptionHeatmapProps {
  misconceptions: MisconceptionData[];
}

const patternLabels: Record<string, string> = {
  confusion: "General Confusion",
  "formula-trouble": "Formula Difficulties",
  application: "When to Apply",
  errors: "Making Mistakes",
};

const patternColors: Record<string, string> = {
  confusion: "bg-red-100 text-red-800 border-red-200",
  "formula-trouble": "bg-amber-100 text-amber-800 border-amber-200",
  application: "bg-blue-100 text-blue-800 border-blue-200",
  errors: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function MisconceptionHeatmap({ misconceptions }: MisconceptionHeatmapProps) {
  if (misconceptions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Misconception Patterns</h2>
        <div className="text-center py-8 text-stone-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No misconception patterns detected</p>
          <p className="text-sm mt-1">Need more data to identify patterns</p>
        </div>
      </div>
    );
  }

  // Group by topic
  const byTopic = misconceptions.reduce((acc, m) => {
    if (!acc[m.topicId]) {
      acc[m.topicId] = { name: m.topicName, patterns: [] };
    }
    acc[m.topicId].patterns.push(m);
    return acc;
  }, {} as Record<string, { name: string; patterns: MisconceptionData[] }>);

  // Get all unique patterns for legend
  const allPatterns = [...new Set(misconceptions.map((m) => m.pattern))];

  return (
    <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
      <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Misconception Patterns</h2>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {allPatterns.map((pattern) => (
          <span
            key={pattern}
            className={`text-xs px-2 py-1 rounded border ${patternColors[pattern] || "bg-stone-100 text-stone-600 border-stone-200"}`}
          >
            {patternLabels[pattern] || pattern}
          </span>
        ))}
      </div>

      {/* Heat map grid */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {Object.entries(byTopic).map(([topicId, { name, patterns }]) => (
          <div key={topicId} className="flex items-start gap-3">
            <span className="text-sm text-stone-700 font-medium w-32 truncate shrink-0" title={name}>
              {name}
            </span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {patterns.map((p, i) => {
                // Calculate intensity based on student count
                const intensity = Math.min(p.studentCount / 5, 1);
                return (
                  <div
                    key={`${p.pattern}-${i}`}
                    className={`relative group px-2 py-1 rounded text-xs font-medium border ${
                      patternColors[p.pattern] || "bg-stone-100 text-stone-600 border-stone-200"
                    }`}
                    style={{ opacity: 0.5 + intensity * 0.5 }}
                  >
                    {patternLabels[p.pattern] || p.pattern}
                    <span className="ml-1 opacity-70">({p.studentCount})</span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-stone-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {p.studentCount} student{p.studentCount !== 1 ? "s" : ""}, {p.frequency} occurrence{p.frequency !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
