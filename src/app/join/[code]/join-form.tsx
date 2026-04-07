"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface JoinFormProps {
  courseCode: string;
  courseName: string;
}

export default function JoinForm({ courseCode, courseName }: JoinFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    // Basic email validation
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), courseCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Save email to localStorage for study session
      localStorage.setItem("stats-tutor-email", email.trim().toLowerCase());
      localStorage.setItem("stats-tutor-group", "krokyo");

      // Clear any old anonymous session
      localStorage.removeItem("stats-tutor-session");

      // Redirect to study page
      router.push("/study");
    } catch {
      setError("Failed to join course. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
          Your Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          placeholder="you@university.edu"
          autoFocus
        />
        <p className="text-xs text-stone-500 mt-2">
          Use your university email to save your progress
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-gradient disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
        style={{ boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)' }}
      >
        {loading ? "Joining..." : "Join Course & Start Learning"}
      </button>

      <p className="text-xs text-stone-400 text-center mt-4">
        By joining, your study progress will be visible to your professor.
      </p>
    </form>
  );
}
