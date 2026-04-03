"use client";

import { useEffect, useState } from "react";

type Prompt = {
  id: string;
  name: string;
  content: string;
  description: string | null;
  updatedAt: string;
  createdAt: string;
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [krokyoContent, setKrokyoContent] = useState("");
  const [controlContent, setControlContent] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompts();
  }, []);

  async function fetchPrompts() {
    const res = await fetch("/api/admin/prompts");
    if (res.ok) {
      const data = await res.json();
      setPrompts(data.prompts);

      const krokyo = data.prompts.find((p: Prompt) => p.name === "krokyo");
      const control = data.prompts.find((p: Prompt) => p.name === "control");

      if (krokyo) setKrokyoContent(krokyo.content);
      if (control) setControlContent(control.content);
    }
    setLoading(false);
  }

  async function handleSave(name: "krokyo" | "control") {
    setSaving(name);
    setSuccessMessage(null);

    const content = name === "krokyo" ? krokyoContent : controlContent;
    const description = name === "krokyo"
      ? "Socratic method - asks questions to probe understanding before giving answers"
      : "Direct answers - gives complete explanations immediately";

    const res = await fetch("/api/admin/prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content, description }),
    });

    if (res.ok) {
      const data = await res.json();
      setPrompts((prev) =>
        prev.map((p) => (p.name === name ? data.prompt : p))
      );
      setSuccessMessage(`${name === "krokyo" ? "Krokyo" : "Control"} prompt saved successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }

    setSaving(null);
  }

  const krokyoPrompt = prompts.find((p) => p.name === "krokyo");
  const controlPrompt = prompts.find((p) => p.name === "control");

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-stone-200 rounded w-48 mb-4" />
            <div className="h-4 bg-stone-200 rounded w-64 mb-8" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-96 bg-stone-100 rounded-xl" />
              <div className="h-96 bg-stone-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-stone-900 tracking-tight">System Prompts</h1>
          <p className="text-stone-500 mt-1">Edit the AI tutor prompts for each experimental group</p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Krokyo Prompt */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <div>
                  <h2 className="font-display font-semibold text-stone-900">Krokyo (Socratic)</h2>
                  <p className="text-xs text-stone-500">Asks questions to probe understanding</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={krokyoContent}
                onChange={(e) => setKrokyoContent(e.target.value)}
                className="w-full h-80 p-4 border border-stone-200 rounded-lg font-mono text-sm text-stone-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                placeholder="Enter the Krokyo system prompt..."
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-stone-400">
                  {krokyoPrompt?.updatedAt && (
                    <>Last updated: {new Date(krokyoPrompt.updatedAt).toLocaleString()}</>
                  )}
                </p>
                <button
                  onClick={() => handleSave("krokyo")}
                  disabled={saving === "krokyo"}
                  className="px-4 py-2 bg-primary-gradient text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg disabled:opacity-50"
                  style={{ boxShadow: "0 2px 8px rgba(15, 118, 110, 0.25)" }}
                >
                  {saving === "krokyo" ? "Saving..." : "Save Krokyo Prompt"}
                </button>
              </div>
            </div>
          </div>

          {/* Control Prompt */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-soft-sm overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-violet-50">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <div>
                  <h2 className="font-display font-semibold text-stone-900">Control (Direct)</h2>
                  <p className="text-xs text-stone-500">Gives complete explanations immediately</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={controlContent}
                onChange={(e) => setControlContent(e.target.value)}
                className="w-full h-80 p-4 border border-stone-200 rounded-lg font-mono text-sm text-stone-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                placeholder="Enter the Control system prompt..."
              />
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-stone-400">
                  {controlPrompt?.updatedAt && (
                    <>Last updated: {new Date(controlPrompt.updatedAt).toLocaleString()}</>
                  )}
                </p>
                <button
                  onClick={() => handleSave("control")}
                  disabled={saving === "control"}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {saving === "control" ? "Saving..." : "Save Control Prompt"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-stone-100 rounded-xl p-6">
          <h3 className="font-display text-sm font-semibold text-stone-700 mb-2">About System Prompts</h3>
          <div className="text-sm text-stone-600 space-y-2">
            <p>
              <strong>Krokyo (Socratic):</strong> Uses the Socratic method to guide students through problems
              by asking probing questions before providing answers.
            </p>
            <p>
              <strong>Control (Direct):</strong> Provides complete, direct answers to student questions
              without the question-based exploration.
            </p>
            <p className="text-stone-500 mt-4">
              Changes take effect immediately for new conversations. Existing conversations continue with their original prompts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
