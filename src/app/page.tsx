import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Stats 101 Exam Prep
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Chapters 8, 9 &amp; 10
        </p>
        <p className="text-gray-500 mb-8">
          Confidence Intervals &bull; Hypothesis Testing &bull; Two-Sample Inference
        </p>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 text-left shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">How this works:</h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-medium">1.</span>
              <span>Pick a topic you want to study</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-medium">2.</span>
              <span>Ask questions in plain English</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-medium">3.</span>
              <span>I&apos;ll guide you to understanding (not just give you answers)</span>
            </li>
          </ul>
        </div>

        <Link
          href="/study"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg text-lg transition-colors"
        >
          Start Studying
        </Link>

        <p className="text-gray-400 text-sm mt-8">
          Built for exam prep. No login required.
        </p>
      </div>
    </div>
  );
}
