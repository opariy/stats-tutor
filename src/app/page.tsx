import Link from "next/link";
import Image from "next/image";

export default function Home() {
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
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
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
        <h1 className="font-display text-5xl font-bold text-stone-900 mb-4 tracking-tight">
          Learn anything with AI
        </h1>
        <p className="text-xl text-stone-600 mb-8 max-w-2xl mx-auto">
          Describe what you want to learn. AI generates a personalized curriculum and guides you through it step by step.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {/* Start Learning */}
          <Link
            href="/learn/new"
            className="group bg-white border border-stone-200 rounded-xl p-6 text-center transition-all hover:border-teal-300 hover:shadow-soft-md hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 bg-primary-gradient text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-soft-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-stone-900 mb-1 group-hover:text-teal-700 transition-colors">
              Start Learning
            </h3>
            <p className="text-sm text-stone-500">
              Describe what you want to learn
            </p>
          </Link>

          {/* Test My Knowledge */}
          <Link
            href="/assess/new"
            className="group bg-white border border-stone-200 rounded-xl p-6 text-center transition-all hover:border-teal-300 hover:shadow-soft-md hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-soft-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-stone-900 mb-1 group-hover:text-teal-700 transition-colors">
              Test My Knowledge
            </h3>
            <p className="text-sm text-stone-500">
              Check what you already know
            </p>
          </Link>

          {/* Exam Prep */}
          <Link
            href="/learn/exam-prep"
            className="group bg-white border border-stone-200 rounded-xl p-6 text-center transition-all hover:border-teal-300 hover:shadow-soft-md hover:-translate-y-0.5"
          >
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-soft-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-stone-900 mb-1 group-hover:text-teal-700 transition-colors">
              Exam Prep
            </h3>
            <p className="text-sm text-stone-500">
              Upload your curriculum files
            </p>
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-soft-md">
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-6 text-center tracking-tight">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-gradient text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-display font-semibold shadow-soft-sm">
                1
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Describe your goal</h3>
              <p className="text-sm text-stone-500">Tell me what you want to learn - any subject, any level</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-gradient text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-display font-semibold shadow-soft-sm">
                2
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Get a curriculum</h3>
              <p className="text-sm text-stone-500">AI generates chapters and topics tailored to your needs</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-gradient text-white rounded-xl flex items-center justify-center mx-auto mb-4 font-display font-semibold shadow-soft-sm">
                3
              </div>
              <h3 className="font-medium text-stone-900 mb-2">Learn interactively</h3>
              <p className="text-sm text-stone-500">Work through topics with guided explanations and practice</p>
            </div>
          </div>
        </div>
      </div>

      {/* Example subjects */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4 text-center tracking-tight">
          Learn anything
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            "Machine Learning",
            "Web Development",
            "Data Science",
            "Economics",
            "Psychology",
            "Philosophy",
            "Music Theory",
            "Creative Writing",
            "Marketing",
            "Finance",
          ].map((subject) => (
            <Link
              key={subject}
              href={`/learn/new?subject=${encodeURIComponent(subject)}`}
              className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-all"
            >
              {subject}
            </Link>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 py-8">
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
              Come back anytime and continue where you left off. Your entire learning history is preserved.
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
              Not just answers - guided explanations followed by questions to help you truly understand.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-6 py-8 text-center">
        <p className="text-stone-500 mb-4">Ready to start learning?</p>
        <Link
          href="/learn/new"
          className="inline-flex items-center justify-center gap-2 bg-primary-gradient text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:-translate-y-0.5"
          style={{ boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)' }}
        >
          Create Your Curriculum
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
            <p>AI-powered personalized learning.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/statistics"
              className="text-stone-400 hover:text-teal-600 transition-colors"
            >
              Statistics Course
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
