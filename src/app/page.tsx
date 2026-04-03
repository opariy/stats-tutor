import Link from "next/link";
import { chapters } from "@/lib/topics";

export default function Home() {
  const totalTopics = chapters.reduce((sum, ch) => sum + ch.topics.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">📊</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Stats 101 Exam Prep
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Engineering Statistics: Chapters 1-10
        </p>
        <p className="text-gray-500 mb-8">
          {totalTopics} topics &bull; AI-powered tutoring &bull; Free
        </p>

        <Link
          href="/study"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-blue-200"
        >
          Start Studying
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>

        <p className="text-gray-400 text-sm mt-4">
          No login required &bull; Your chat history is saved
        </p>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-semibold">
                1
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Pick a topic</h3>
              <p className="text-sm text-gray-500">Browse by chapter or ask about anything</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-semibold">
                2
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Ask questions</h3>
              <p className="text-sm text-gray-500">In plain English, about any concept</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-semibold">
                3
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Learn by doing</h3>
              <p className="text-sm text-gray-500">I&apos;ll guide you to understanding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Topics covered */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Topics Covered</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((chapter) => (
            <div key={chapter.number} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-gray-100 text-gray-600 text-xs font-medium rounded flex items-center justify-center">
                  {chapter.number}
                </span>
                <h3 className="font-medium text-gray-900 text-sm">{chapter.title}</h3>
              </div>
              <p className="text-xs text-gray-500">
                {chapter.topics.length} topics
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-100 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-green-900">Your progress is saved</h3>
            </div>
            <p className="text-sm text-green-700">
              Come back anytime and continue where you left off. Your entire conversation history is preserved.
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-medium text-purple-900">Active learning</h3>
            </div>
            <p className="text-sm text-purple-700">
              Instead of just giving answers, I&apos;ll ask you questions to help you truly understand the concepts.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <Link
          href="/study"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Start Studying Now
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
          <p>Built for engineering statistics students.</p>
        </div>
      </footer>
    </div>
  );
}
