"use client";

import { useState, useCallback } from "react";

interface ReviewSessionModalProps {
  daysUntilExam: number;
}

const PLAN_TEXT = (days: number) => `Review Session Plan — Hypothesis Testing

Auto-generated from 33 active students · Exam in ${days} days
Duration: 50 minutes
Goal: Address the 3 highest-impact reasoning gaps before the exam


1. Opening diagnostic (5 min)

Cold-call poll: "A study reports p = 0.03. What does this mean?"

Expected wrong answers (based on cohort data):
• "There's a 3% chance H₀ is true" — 67% of your students currently believe this
• "There's a 97% chance the alternative is true" — common follow-on

Use the wrong answers as the hook for the rest of the session.


2. p-value, properly (12 min)

Concept: p-value is P(data | H₀), not P(H₀ | data).

Demo: Run a quick simulation (R or Excel) generating 1000 samples under H₀. Show that p-values are uniformly distributed. Students see p is a property of the data assuming H₀, not a property of H₀ itself.

Why this works: attacks the conceptual mechanism, not the symptom.


3. Type I vs Type II, with stakes (10 min)

52% of your cohort still swaps these definitions.

Use the courtroom frame, then immediately apply it to a real study design tradeoff: "You're testing a new cancer drug. Which error is worse here? Now flip it: you're testing a new airline safety protocol. Which error is worse?"

Have students vote, then defend.


4. Failing to reject ≠ accepting H₀ (8 min)

28% of your cohort treats p > α as "H₀ is true."

Show an underpowered study (n=10) where a real effect exists but p = 0.18. Then show the same study at n=200 where p = 0.001. Same effect, different conclusion. Students see that "fail to reject" means insufficient evidence, not evidence of nothing.


5. Confidence interval interpretation (10 min)

71% of your cohort thinks "95% CI" means "95% chance μ is in this interval."

Live simulate 20 confidence intervals. Show ~19 contain the true μ. Emphasize: "The interval is random. μ is fixed. The 95% refers to the procedure, not this specific interval."


Students to check on after this session:
Avery Brown, Taylor Kim, Jamie Lee, Alex Chen — currently below 45% mastery on hypothesis testing.`;

export function ReviewSessionButton({ daysUntilExam }: ReviewSessionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGenerating(false);
    setIsOpen(true);
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PLAN_TEXT(daysUntilExam));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = PLAN_TEXT(daysUntilExam);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [daysUntilExam]);

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating plan...
          </>
        ) : (
          "Generate review session plan"
        )}
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-stone-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded bg-teal-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-xs text-teal-600 font-medium">Auto-generated by Krokyo</span>
                  </div>
                  <h2 className="text-xl font-bold text-stone-900">Review Session Plan — Hypothesis Testing</h2>
                  <p className="text-sm text-stone-500 mt-1">
                    Generated from 33 active students · Exam in {daysUntilExam} days
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full">Duration: 50 minutes</span>
                <span className="text-stone-600">Goal: Address the 3 highest-impact reasoning gaps before the exam</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Section 1 */}
              <section>
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">1</span>
                  Opening diagnostic
                  <span className="text-xs font-normal text-stone-400 ml-auto">5 min</span>
                </h3>
                <div className="mt-3 pl-8 space-y-3">
                  <p className="text-sm text-stone-700">
                    <strong>Cold-call poll:</strong> &quot;A study reports p = 0.03. What does this mean?&quot;
                  </p>
                  <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-rose-700 mb-2">Expected wrong answers (based on cohort data):</p>
                    <ul className="text-sm text-stone-700 space-y-1">
                      <li>• &quot;There&apos;s a 3% chance H₀ is true&quot; — <span className="text-rose-600 font-semibold">67% of your students currently believe this</span></li>
                      <li>• &quot;There&apos;s a 97% chance the alternative is true&quot; — common follow-on</li>
                    </ul>
                  </div>
                  <p className="text-sm text-stone-600 italic">Use the wrong answers as the hook for the rest of the session.</p>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">2</span>
                  p-value, properly
                  <span className="text-xs font-normal text-stone-400 ml-auto">12 min</span>
                </h3>
                <div className="mt-3 pl-8 space-y-3">
                  <p className="text-sm text-stone-700">
                    <strong>Concept:</strong> p-value is P(data | H₀), not P(H₀ | data).
                  </p>
                  <p className="text-sm text-stone-700">
                    <strong>Demo:</strong> Run a quick simulation (R or Excel) generating 1000 samples under H₀. Show that p-values are uniformly distributed. Students see p is a property of the data assuming H₀, not a property of H₀ itself.
                  </p>
                  <p className="text-sm text-teal-700 bg-teal-50 px-3 py-2 rounded">
                    <strong>Why this works:</strong> attacks the conceptual mechanism, not the symptom.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">3</span>
                  Type I vs Type II, with stakes
                  <span className="text-xs font-normal text-stone-400 ml-auto">10 min</span>
                </h3>
                <div className="mt-3 pl-8 space-y-3">
                  <p className="text-sm text-stone-700">
                    <span className="text-rose-600 font-semibold">52% of your cohort</span> still swaps these definitions.
                  </p>
                  <p className="text-sm text-stone-700">
                    Use the courtroom frame, then immediately apply it to a real study design tradeoff: &quot;You&apos;re testing a new cancer drug. Which error is worse here? Now flip it: you&apos;re testing a new airline safety protocol. Which error is worse?&quot;
                  </p>
                  <p className="text-sm text-stone-600 italic">Have students vote, then defend.</p>
                </div>
              </section>

              {/* Section 4 */}
              <section>
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">4</span>
                  Failing to reject ≠ accepting H₀
                  <span className="text-xs font-normal text-stone-400 ml-auto">8 min</span>
                </h3>
                <div className="mt-3 pl-8 space-y-3">
                  <p className="text-sm text-stone-700">
                    <span className="text-rose-600 font-semibold">28% of your cohort</span> treats p &gt; α as &quot;H₀ is true.&quot;
                  </p>
                  <p className="text-sm text-stone-700">
                    Show an underpowered study (n=10) where a real effect exists but p = 0.18. Then show the same study at n=200 where p = 0.001. Same effect, different conclusion. Students see that &quot;fail to reject&quot; means insufficient evidence, not evidence of nothing.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section>
                <h3 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">5</span>
                  Confidence interval interpretation
                  <span className="text-xs font-normal text-stone-400 ml-auto">10 min</span>
                </h3>
                <div className="mt-3 pl-8 space-y-3">
                  <p className="text-sm text-stone-700">
                    <span className="text-rose-600 font-semibold">71% of your cohort</span> thinks &quot;95% CI&quot; means &quot;95% chance μ is in this interval.&quot;
                  </p>
                  <p className="text-sm text-stone-700">
                    Live simulate 20 confidence intervals. Show ~19 contain the true μ. Emphasize: &quot;The interval is random. μ is fixed. The 95% refers to the procedure, not this specific interval.&quot;
                  </p>
                </div>
              </section>

              {/* Follow-up */}
              <section className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <h3 className="text-sm font-semibold text-stone-800 mb-2">Students to check on after this session:</h3>
                <div className="flex flex-wrap gap-2">
                  {["Avery Brown", "Taylor Kim", "Jamie Lee", "Alex Chen"].map((name) => (
                    <span key={name} className="text-sm bg-white border border-stone-200 text-stone-700 px-3 py-1 rounded-lg">
                      {name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-stone-500 mt-2">Currently below 45% mastery on hypothesis testing.</p>
              </section>
            </div>

            {/* Footer */}
            <div className="border-t border-stone-200 p-4 flex items-center justify-between bg-stone-50 rounded-b-2xl">
              <p className="text-xs text-stone-400">Generated from cohort reasoning data · {new Date().toLocaleDateString()}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-stone-600 hover:text-stone-800 px-4 py-2"
                >
                  Close
                </button>
                <button
                  onClick={handleCopy}
                  className="text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    "Copy to clipboard"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
