"use client";

import { useEffect, useState } from "react";

type Chapter = {
  id: number;
  number: number;
  title: string;
  sortOrder: number | null;
  isActive: boolean | null;
};

type Topic = {
  id: string;
  name: string;
  chapterNumber: number;
  description: string;
  sortOrder: number | null;
  isActive: boolean | null;
  updatedAt: string;
  createdAt: string;
};

type EditingTopic = {
  id: string;
  name: string;
  chapterNumber: number;
  description: string;
};

export default function TopicsPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [editingTopic, setEditingTopic] = useState<EditingTopic | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTopic, setNewTopic] = useState<EditingTopic>({
    id: "",
    name: "",
    chapterNumber: 1,
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const res = await fetch("/api/admin/topics");
    if (res.ok) {
      const data = await res.json();
      setChapters(data.chapters);
      setTopics(data.topics);
      // Expand all chapters by default
      setExpandedChapters(new Set(data.chapters.map((c: Chapter) => c.number)));
    }
    setLoading(false);
  }

  function toggleChapter(chapterNumber: number) {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterNumber)) {
        next.delete(chapterNumber);
      } else {
        next.add(chapterNumber);
      }
      return next;
    });
  }

  async function handleSaveTopic() {
    if (!editingTopic) return;
    setSaving(true);

    const res = await fetch(`/api/admin/topics/${editingTopic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingTopic),
    });

    if (res.ok) {
      const data = await res.json();
      setTopics((prev) =>
        prev.map((t) => (t.id === editingTopic.id ? data.topic : t))
      );
      setEditingTopic(null);
      setSuccessMessage("Topic updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    }

    setSaving(false);
  }

  async function handleCreateTopic() {
    if (!newTopic.id || !newTopic.name || !newTopic.description) {
      alert("Please fill in all fields");
      return;
    }
    setSaving(true);

    const res = await fetch("/api/admin/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTopic),
    });

    if (res.ok) {
      const data = await res.json();
      setTopics((prev) => [...prev, data.topic]);
      setIsCreating(false);
      setNewTopic({ id: "", name: "", chapterNumber: 1, description: "" });
      setSuccessMessage("Topic created successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      const error = await res.json();
      alert(error.error || "Failed to create topic");
    }

    setSaving(false);
  }

  async function handleToggleActive(topic: Topic) {
    const res = await fetch(`/api/admin/topics/${topic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !topic.isActive }),
    });

    if (res.ok) {
      const data = await res.json();
      setTopics((prev) =>
        prev.map((t) => (t.id === topic.id ? data.topic : t))
      );
    }
  }

  async function handleDeleteTopic(topicId: string) {
    if (!confirm("Are you sure you want to delete this topic? It will be marked as inactive.")) {
      return;
    }

    const res = await fetch(`/api/admin/topics/${topicId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, isActive: false } : t))
      );
      setSuccessMessage("Topic deleted");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }

  function getTopicsForChapter(chapterNumber: number) {
    return topics.filter((t) => t.chapterNumber === chapterNumber);
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-stone-200 rounded w-48 mb-4" />
            <div className="h-4 bg-stone-200 rounded w-64 mb-8" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-stone-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">Topics</h1>
            <p className="text-stone-500 mt-1">Manage study topics organized by chapter</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary-gradient text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg"
            style={{ boxShadow: "0 2px 8px rgba(15, 118, 110, 0.25)" }}
          >
            Add Topic
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium">
            {successMessage}
          </div>
        )}

        {/* Create Topic Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="font-display text-xl font-bold text-stone-900 mb-4">Add New Topic</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Topic ID</label>
                  <input
                    type="text"
                    value={newTopic.id}
                    onChange={(e) => setNewTopic({ ...newTopic, id: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="e.g., hypothesis-testing"
                  />
                  <p className="text-xs text-stone-400 mt-1">Lowercase with hyphens, no spaces</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newTopic.name}
                    onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Topic name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Chapter</label>
                  <select
                    value={newTopic.chapterNumber}
                    onChange={(e) => setNewTopic({ ...newTopic, chapterNumber: parseInt(e.target.value) })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {chapters.map((ch) => (
                      <option key={ch.number} value={ch.number}>
                        Chapter {ch.number}: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                  <textarea
                    value={newTopic.description}
                    onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="Brief description of the topic"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewTopic({ id: "", name: "", chapterNumber: 1, description: "" });
                  }}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTopic}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-gradient text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Topic"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Topic Modal */}
        {editingTopic && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="font-display text-xl font-bold text-stone-900 mb-4">Edit Topic</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Topic ID</label>
                  <input
                    type="text"
                    value={editingTopic.id}
                    disabled
                    className="w-full border border-stone-200 bg-stone-50 rounded-lg px-3 py-2 text-sm text-stone-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingTopic.name}
                    onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Chapter</label>
                  <select
                    value={editingTopic.chapterNumber}
                    onChange={(e) => setEditingTopic({ ...editingTopic, chapterNumber: parseInt(e.target.value) })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {chapters.map((ch) => (
                      <option key={ch.number} value={ch.number}>
                        Chapter {ch.number}: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                  <textarea
                    value={editingTopic.description}
                    onChange={(e) => setEditingTopic({ ...editingTopic, description: e.target.value })}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTopic}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-gradient text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chapters Accordion */}
        <div className="space-y-4">
          {chapters.map((chapter) => {
            const chapterTopics = getTopicsForChapter(chapter.number);
            const activeTopics = chapterTopics.filter((t) => t.isActive !== false);
            const isExpanded = expandedChapters.has(chapter.number);

            return (
              <div
                key={chapter.number}
                className="bg-white rounded-xl border border-stone-200 shadow-soft-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleChapter(chapter.number)}
                  className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-sm font-bold text-stone-600">
                      {chapter.number}
                    </span>
                    <div className="text-left">
                      <h3 className="font-display font-semibold text-stone-900">{chapter.title}</h3>
                      <p className="text-xs text-stone-500">{activeTopics.length} active topics</p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-stone-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="border-t border-stone-200">
                    {chapterTopics.length > 0 ? (
                      <div className="divide-y divide-stone-100">
                        {chapterTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className={`p-4 flex items-center justify-between ${
                              topic.isActive === false ? "bg-stone-50 opacity-60" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-stone-900">{topic.name}</h4>
                                {topic.isActive === false && (
                                  <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-stone-500 truncate">{topic.description}</p>
                              <p className="text-xs text-stone-400 font-mono mt-1">ID: {topic.id}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => handleToggleActive(topic)}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                                  topic.isActive === false
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                                }`}
                              >
                                {topic.isActive === false ? "Activate" : "Deactivate"}
                              </button>
                              <button
                                onClick={() =>
                                  setEditingTopic({
                                    id: topic.id,
                                    name: topic.name,
                                    chapterNumber: topic.chapterNumber,
                                    description: topic.description,
                                  })
                                }
                                className="px-3 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTopic(topic.id)}
                                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-stone-500">
                        No topics in this chapter
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-8 bg-stone-100 rounded-xl p-6">
          <h3 className="font-display text-sm font-semibold text-stone-700 mb-3">Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-stone-500">Total Chapters</p>
              <p className="text-xl font-bold text-stone-900">{chapters.length}</p>
            </div>
            <div>
              <p className="text-stone-500">Total Topics</p>
              <p className="text-xl font-bold text-stone-900">{topics.length}</p>
            </div>
            <div>
              <p className="text-stone-500">Active Topics</p>
              <p className="text-xl font-bold text-emerald-600">
                {topics.filter((t) => t.isActive !== false).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
