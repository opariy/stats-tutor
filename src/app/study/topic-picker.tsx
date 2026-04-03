"use client";

import { useState } from "react";
import { chapters, type Topic } from "@/lib/topics";

type TopicPickerProps = {
  onSelectTopic: (topic: Topic | null) => void;
  selectedTopic: Topic | null;
};

export default function TopicPicker({ onSelectTopic, selectedTopic }: TopicPickerProps) {
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  return (
    <div className="bg-white border-r border-stone-200 w-72 flex flex-col h-full">
      <div className="p-5 border-b border-stone-100">
        <h2 className="font-display text-sm font-semibold text-stone-900">Topics</h2>
        <p className="text-xs text-stone-500 mt-1">Select a topic to focus your study</p>
      </div>

      {/* General Chat Option */}
      <button
        onClick={() => {
          onSelectTopic(null);
          setExpandedChapter(null);
        }}
        className={`w-full text-left px-5 py-4 text-sm border-b border-stone-100 transition-all ${
          selectedTopic === null
            ? "bg-teal-50 text-teal-700 font-medium"
            : "text-stone-700 hover:bg-stone-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          General Questions
        </div>
        <p className="text-xs text-stone-500 mt-1 ml-7">Ask about any topic</p>
      </button>

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto">
        {chapters.map((chapter) => (
          <div key={chapter.number} className="border-b border-stone-100">
            <button
              onClick={() =>
                setExpandedChapter(expandedChapter === chapter.number ? null : chapter.number)
              }
              className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 text-xs font-semibold flex items-center justify-center">
                  {chapter.number}
                </span>
                <span className="text-sm text-stone-900 font-medium">{chapter.title}</span>
              </div>
              <svg
                className={`w-4 h-4 text-stone-400 transition-transform ${
                  expandedChapter === chapter.number ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedChapter === chapter.number && (
              <div className="bg-stone-50 pb-2">
                {chapter.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onSelectTopic(topic)}
                    className={`w-full text-left px-5 py-2.5 pl-14 text-sm transition-all ${
                      selectedTopic?.id === topic.id
                        ? "bg-teal-100 text-teal-700 font-medium"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected Topic Info */}
      {selectedTopic && (
        <div className="p-5 border-t border-stone-200 bg-teal-50">
          <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider">
            Focused on
          </p>
          <p className="text-sm font-semibold text-teal-900 mt-1">{selectedTopic.name}</p>
          <p className="text-xs text-teal-700 mt-1 leading-relaxed">{selectedTopic.description}</p>
        </div>
      )}
    </div>
  );
}
