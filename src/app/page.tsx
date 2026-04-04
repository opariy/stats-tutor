import Link from "next/link";
import Image from "next/image";
import { chapters } from "@/lib/topics";

export default function Home() {
  const totalTopics = chapters.reduce((sum, ch) => sum + ch.topics.length, 0);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 pt-6">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <Image
            src="/logo-text.png"
            alt="Krokyo"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-16 text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 bg-primary-gradient rounded-2xl blur-sm opacity-50 scale-110" />
          <Image
            src="/logo.png"
            alt="Krokyo"
            width={80}
            height={80}
            className="relative rounded-2xl shadow-soft-md"
          />
        </div>
        <h1 className="font-display text-5xl font-bold text-stone-900 mb-4 tracking-tight">
          Learn anything with AI
        </h1>
        <p className="text-xl text-stone-600 mb-2">
          Engineering Statistics: Chapters 1-10
        </p>
        <p className="text-stone-500 mb-10">
          {totalTopics} topics &bull; Socratic tutoring &bull; Free
        </p>

        <Link
          href="/study"
          className="inline-flex items-center gap-2 bg-primary-gradient text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
          style={{ boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)' }}
        >
          Start Studying
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>

        <p className="text-stone-400 text-sm mt-5">
          No login required &bull; Your chat history is saved
        </p>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white border border-stone-200 rounded-2xl p-10 shadow-soft-md">
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-8 text-center tracking-tight">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-gradient text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-display font-semibold shadow-soft-sm">
                1
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Pick a topic</h3>
              <p className="text-sm text-stone-500">Browse by chapter or ask about anything</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-gradient text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-display font-semibold shadow-soft-sm">
                2
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Ask questions</h3>
              <p className="text-sm text-stone-500">In plain English, about any concept</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-gradient text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-display font-semibold shadow-soft-sm">
                3
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Learn by doing</h3>
              <p className="text-sm text-stone-500">I&apos;ll guide you to understanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Topics covered */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="font-display text-xl font-semibold text-stone-900 mb-8 text-center tracking-tight">
          Topics Covered
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((chapter) => (
            <div
              key={chapter.number}
              className="bg-white border border-stone-200 rounded-xl p-5 shadow-soft-sm hover:shadow-soft-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="w-7 h-7 bg-stone-100 text-stone-600 text-xs font-semibold rounded-lg flex items-center justify-center">
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
      <div className="max-w-4xl mx-auto px-6 py-12">
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
              <h3 className="font-medium text-teal-900">Active learning</h3>
            </div>
            <p className="text-sm text-teal-700">
              Instead of just giving answers, I&apos;ll ask you questions to help you truly understand the concepts.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <Link
          href="/study"
          className="inline-flex items-center gap-2 bg-primary-gradient text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
          style={{ boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)' }}
        >
          Start Studying Now
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-8">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-center gap-3 text-sm text-stone-500">
          <Image
            src="/logo.png"
            alt="Krokyo"
            width={24}
            height={24}
            className="rounded-md opacity-60"
          />
          <p>Built for engineering statistics students.</p>
        </div>
      </footer>
    </div>
  );
}
