"use client";

import { useState, useEffect } from "react";

interface EnrollmentLinkBannerProps {
  courseCode: string;
}

export default function EnrollmentLinkBanner({ courseCode }: EnrollmentLinkBannerProps) {
  const [baseUrl, setBaseUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const enrollmentUrl = `${baseUrl}/join/${courseCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(enrollmentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!baseUrl) return null;

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-teal-900">Student Enrollment Link</p>
        <p className="text-xs text-teal-700 mt-0.5">Share this link with students (e.g., in Canvas)</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <code className="bg-white px-3 py-1.5 rounded-lg text-sm text-teal-800 border border-teal-200 font-mono truncate max-w-[300px]">
          {enrollmentUrl}
        </code>
        <button
          onClick={handleCopy}
          className={`p-2 rounded-lg transition-colors ${
            copied
              ? "bg-green-100 text-green-700"
              : "bg-teal-100 hover:bg-teal-200 text-teal-700"
          }`}
          title={copied ? "Copied!" : "Copy link"}
        >
          {copied ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
