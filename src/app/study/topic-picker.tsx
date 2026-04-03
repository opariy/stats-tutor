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
    <div className="bg-white border-r border-gray-200 w-72 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Topics</h2>
        <p className="text-xs text-gray-500 mt-1">Select a topic to focus your study</p>
      </div>

      {/* General Chat Option */}
      <button
        onClick={() => {
          onSelectTopic(null);
          setExpandedChapter(null);
        }}
        className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 transition-colors ${
          selectedTopic === null
            ? "bg-blue-50 text-blue-700 font-medium"
            : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-2">
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
        <p className="text-xs text-gray-500 mt-0.5 ml-6">Ask about any topic</p>
      </button>

      {/* Chapter List */}
      <div className="flex-1 overflow-y-auto">
        {chapters.map((chapter) => (
          <div key={chapter.number} className="border-b border-gray-100">
            <button
              onClick={() =>
                setExpandedChapter(expandedChapter === chapter.number ? null : chapter.number)
              }
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
                  {chapter.number}
                </span>
                <span className="text-sm text-gray-900">{chapter.title}</span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
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
              <div className="bg-gray-50 pb-2">
                {chapter.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onSelectTopic(topic)}
                    className={`w-full text-left px-4 py-2 pl-12 text-sm transition-colors ${
                      selectedTopic?.id === topic.id
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
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
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
            Focused on
          </p>
          <p className="text-sm font-semibold text-blue-900 mt-1">{selectedTopic.name}</p>
          <p className="text-xs text-blue-700 mt-1">{selectedTopic.description}</p>
        </div>
      )}
    </div>
  );
}
