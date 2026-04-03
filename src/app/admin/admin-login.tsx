"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.refresh();
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-gradient rounded-xl flex items-center justify-center mx-auto mb-4 shadow-soft-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">Admin Access</h1>
          <p className="text-stone-500 mt-1">Enter password to view dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-primary-gradient disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)' }}
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
