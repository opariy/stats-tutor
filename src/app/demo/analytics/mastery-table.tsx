"use client";

import React, { useState } from "react";

// Topics for the mastery grid
const TOPICS = [
  "Hypothesis Testing",
  "t-test vs z-test",
  "P-values",
  "Confidence Intervals",
  "Type I/II Errors",
  "Normal Dist.",
] as const;

type MasteryLevel = "red" | "yellow" | "green" | "none";

interface StudentMastery {
  id: string;
  name: string;
  mastery: Record<string, MasteryLevel>;
  misconceptions: string[];
  avgScore: number;
}

// Generate realistic student data
const STUDENTS: StudentMastery[] = [
  {
    id: "1",
    name: "Alex Chen",
    mastery: { "Hypothesis Testing": "yellow", "t-test vs z-test": "red", "P-values": "red", "Confidence Intervals": "yellow", "Type I/II Errors": "red", "Normal Dist.": "green" },
    misconceptions: ["Thinks p-value is P(H₀ is true)", "Uses z-test when σ unknown", "Swaps Type I and Type II definitions"],
    avgScore: 45,
  },
  {
    id: "2",
    name: "Maria Santos",
    mastery: { "Hypothesis Testing": "green", "t-test vs z-test": "green", "P-values": "yellow", "Confidence Intervals": "green", "Type I/II Errors": "green", "Normal Dist.": "green" },
    misconceptions: ["Confuses α with p-value"],
    avgScore: 88,
  },
  {
    id: "3",
    name: "Jordan Park",
    mastery: { "Hypothesis Testing": "yellow", "t-test vs z-test": "yellow", "P-values": "yellow", "Confidence Intervals": "red", "Type I/II Errors": "yellow", "Normal Dist.": "yellow" },
    misconceptions: ["Thinks 95% CI means 95% chance μ is in interval", "Confuses CI width with confidence level"],
    avgScore: 62,
  },
  {
    id: "4",
    name: "Taylor Kim",
    mastery: { "Hypothesis Testing": "red", "t-test vs z-test": "red", "P-values": "red", "Confidence Intervals": "yellow", "Type I/II Errors": "red", "Normal Dist.": "yellow" },
    misconceptions: ["Rejects H₀ when p > α", "Uses z-test when σ unknown", "Swaps Type I and Type II definitions", "Thinks p-value is P(H₀ is true)"],
    avgScore: 38,
  },
  {
    id: "5",
    name: "Sam Johnson",
    mastery: { "Hypothesis Testing": "green", "t-test vs z-test": "yellow", "P-values": "green", "Confidence Intervals": "green", "Type I/II Errors": "yellow", "Normal Dist.": "green" },
    misconceptions: ["Ignores sample size threshold"],
    avgScore: 82,
  },
  {
    id: "6",
    name: "Casey Williams",
    mastery: { "Hypothesis Testing": "yellow", "t-test vs z-test": "green", "P-values": "yellow", "Confidence Intervals": "yellow", "Type I/II Errors": "green", "Normal Dist.": "green" },
    misconceptions: ["Confuses α with p-value", "Ignores sample size effect on CI width"],
    avgScore: 74,
  },
  {
    id: "7",
    name: "Jamie Lee",
    mastery: { "Hypothesis Testing": "red", "t-test vs z-test": "yellow", "P-values": "red", "Confidence Intervals": "red", "Type I/II Errors": "yellow", "Normal Dist.": "red" },
    misconceptions: ["Thinks p-value is P(H₀ is true)", "Thinks 95% CI means 95% chance μ is in interval", "Assumes all data is normally distributed"],
    avgScore: 41,
  },
  {
    id: "8",
    name: "Riley Thompson",
    mastery: { "Hypothesis Testing": "green", "t-test vs z-test": "green", "P-values": "green", "Confidence Intervals": "yellow", "Type I/II Errors": "green", "Normal Dist.": "green" },
    misconceptions: ["Confuses CI width with confidence level"],
    avgScore: 91,
  },
  {
    id: "9",
    name: "Morgan Davis",
    mastery: { "Hypothesis Testing": "yellow", "t-test vs z-test": "red", "P-values": "yellow", "Confidence Intervals": "green", "Type I/II Errors": "red", "Normal Dist.": "yellow" },
    misconceptions: ["Uses z-test when σ unknown", "Thinks reducing α always better"],
    avgScore: 58,
  },
  {
    id: "10",
    name: "Drew Martinez",
    mastery: { "Hypothesis Testing": "green", "t-test vs z-test": "yellow", "P-values": "green", "Confidence Intervals": "green", "Type I/II Errors": "yellow", "Normal Dist.": "green" },
    misconceptions: ["Ignores power in study design"],
    avgScore: 85,
  },
  {
    id: "11",
    name: "Avery Brown",
    mastery: { "Hypothesis Testing": "red", "t-test vs z-test": "red", "P-values": "yellow", "Confidence Intervals": "red", "Type I/II Errors": "red", "Normal Dist.": "yellow" },
    misconceptions: ["Rejects H₀ when p > α", "Applies z-test to small samples", "Swaps Type I and Type II definitions", "Thinks 95% CI means 95% chance μ is in interval"],
    avgScore: 35,
  },
  {
    id: "12",
    name: "Quinn Garcia",
    mastery: { "Hypothesis Testing": "yellow", "t-test vs z-test": "yellow", "P-values": "green", "Confidence Intervals": "yellow", "Type I/II Errors": "yellow", "Normal Dist.": "green" },
    misconceptions: ["Ignores sample size threshold", "Thinks reducing α always better"],
    avgScore: 69,
  },
];

type SortKey = "name" | "avgScore" | typeof TOPICS[number];
type SortDirection = "asc" | "desc";

const masteryOrder: Record<MasteryLevel, number> = { red: 0, yellow: 1, green: 2, none: -1 };

export function MasteryTable() {
  const [sortKey, setSortKey] = useState<SortKey>("avgScore");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [selectedStudent, setSelectedStudent] = useState<StudentMastery | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedStudents = [...STUDENTS].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") {
      cmp = a.name.localeCompare(b.name);
    } else if (sortKey === "avgScore") {
      cmp = a.avgScore - b.avgScore;
    } else {
      // Sort by mastery level for a topic
      cmp = masteryOrder[a.mastery[sortKey] || "none"] - masteryOrder[b.mastery[sortKey] || "none"];
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const getMasteryColor = (level: MasteryLevel) => {
    switch (level) {
      case "green": return "bg-emerald-400";
      case "yellow": return "bg-amber-400";
      case "red": return "bg-rose-400";
      default: return "bg-stone-200";
    }
  };

  const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => (
    <span className={`ml-1 inline-block transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Students Needing Attention</h2>
          <p className="text-sm text-stone-500 mt-1">12 of 47 students flagged. Click any row to see their misconceptions.</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-400" />
            <span className="text-stone-500">Mastered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-400" />
            <span className="text-stone-500">Developing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-400" />
            <span className="text-stone-500">Needs Help</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="text-left text-xs font-medium text-stone-500 pb-3 pr-4">
                Student
              </th>
              {TOPICS.map((topic) => (
                <th
                  key={topic}
                  className="text-center text-xs font-medium text-stone-500 pb-3 px-2 whitespace-nowrap"
                >
                  {topic}
                </th>
              ))}
              <th
                onClick={() => handleSort("avgScore")}
                className="group text-right text-xs font-medium text-stone-500 pb-3 pl-4 cursor-pointer hover:text-stone-700 select-none"
              >
                Avg <span className="text-stone-700">▼</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student) => {
              const isSelected = selectedStudent?.id === student.id;
              return (
                <React.Fragment key={student.id}>
                  <tr
                    onClick={() => setSelectedStudent(isSelected ? null : student)}
                    className={`border-b border-stone-50 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-teal-50"
                        : "hover:bg-stone-50"
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm font-medium text-stone-700">{student.name}</span>
                    </td>
                    {TOPICS.map((topic) => (
                      <td key={topic} className="py-3 px-2 text-center">
                        <div
                          className={`w-6 h-6 rounded mx-auto ${getMasteryColor(student.mastery[topic])}`}
                          title={`${topic}: ${student.mastery[topic]}`}
                        />
                      </td>
                    ))}
                    <td className="py-3 pl-4 text-right">
                      <span className={`text-sm font-semibold ${
                        student.avgScore >= 70 ? "text-emerald-600" :
                        student.avgScore >= 50 ? "text-amber-600" :
                        "text-rose-600"
                      }`}>
                        {student.avgScore}%
                      </span>
                    </td>
                  </tr>
                  {/* Inline detail row */}
                  {isSelected && (
                    <tr>
                      <td colSpan={TOPICS.length + 2} className="p-0">
                        <div className="bg-stone-50 border-y border-stone-200 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-stone-800">
                              {student.name}&apos;s Flagged Misconceptions
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent(null);
                              }}
                              className="text-xs text-stone-400 hover:text-stone-600"
                            >
                              Close
                            </button>
                          </div>
                          {student.misconceptions.length > 0 ? (
                            <ul className="space-y-2">
                              {student.misconceptions.map((m, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="flex-shrink-0 w-5 h-5 rounded bg-rose-100 text-rose-600 flex items-center justify-center text-xs">
                                    !
                                  </span>
                                  <span className="text-sm text-stone-700">{m}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-stone-500">No misconceptions flagged for this student.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-stone-400 mt-4">
        Showing {STUDENTS.length} students flagged for attention out of 47 enrolled
      </p>
    </div>
  );
}
