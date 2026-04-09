import Link from "next/link";
import Image from "next/image";
import { chapters } from "@/lib/topics";

export default function StatisticsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Krokyo"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <span className="font-display text-xl font-bold text-stone-900 tracking-tight group-hover:text-teal-700 transition-colors">
            Krokyo
          </span>
        </Link>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-4 text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-primary-gradient rounded-2xl blur-sm opacity-50 scale-110" />
          <Image
            src="/logo.png"
            alt="Krokyo"
            width={80}
            height={80}
            className="relative rounded-2xl shadow-soft-md"
          />
        </div>
        <h1 className="font-display text-4xl font-bold text-stone-900 mb-3 tracking-tight">
          Engineering Statistics
        </h1>
        <p className="text-xl text-stone-600 mb-6">
          Chapters 1-10 with AI-guided learning
        </p>
        <Link
          href="/study"
          className="inline-flex items-center justify-center gap-2 bg-primary-gradient text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
          style={{ boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)' }}
        >
          Start Studying
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      {/* Topics covered */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-4">
        <h2 className="font-display text-xl font-semibold text-stone-900 mb-4 text-center tracking-tight">
          Topics Covered
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((chapter) => (
            <div
              key={chapter.number}
              className="bg-white border border-stone-200 rounded-xl p-5 shadow-soft-sm hover:shadow-soft-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg flex items-center justify-center">
                  {chapter.number}
                </span>
                <h3 className="font-medium text-stone-900 text-sm">{chapter.title}</h3>
              </div>
              <p className="text-xs text-stone-500 ml-10">
                {chapter.topics.length} topics
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-emerald-900">Your progress is saved</h3>
            </div>
            <p className="text-sm text-emerald-700">
              Come back anytime and continue where you left off. Your entire conversation history is preserved.
            </p>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-medium text-teal-900">Socratic method</h3>
            </div>
            <p className="text-sm text-teal-700">
              I won&apos;t just give you answers. I&apos;ll ask questions to help you truly understand the concepts.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 py-6 text-center">
        <p className="text-stone-500 mb-4">Ready to study?</p>
        <Link
          href="/study"
          className="inline-flex items-center justify-center gap-2 bg-primary-gradient text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
          style={{ boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)' }}
        >
          Start Learning Statistics
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-stone-500">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Krokyo"
              width={24}
              height={24}
              className="rounded-md opacity-60"
            />
            <p>Built for engineering statistics students.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-stone-400 hover:text-teal-600 transition-colors"
            >
              Learn Any Subject
            </Link>
            <Link
              href="/professor"
              className="text-stone-400 hover:text-teal-600 transition-colors"
            >
              For Professors
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
