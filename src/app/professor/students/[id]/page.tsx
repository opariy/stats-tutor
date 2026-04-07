import { getProfessorWithCourses, verifyProfessorOwnsCourse } from "@/lib/professor-auth";
import { getStudentDetail } from "@/lib/professor-metrics";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ courseId?: string }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusStyles = {
  mastered: "bg-green-100 text-green-800",
  "in-progress": "bg-blue-100 text-blue-800",
  abandoned: "bg-stone-100 text-stone-600",
};

const statusLabels = {
  mastered: "Mastered",
  "in-progress": "In Progress",
  abandoned: "Abandoned",
};

const healthStatusStyles = {
  healthy: "bg-green-100 text-green-800",
  "at-risk": "bg-amber-100 text-amber-800",
  stuck: "bg-red-100 text-red-800",
  "not-started": "bg-stone-100 text-stone-600",
};

const healthStatusLabels = {
  healthy: "Healthy",
  "at-risk": "At Risk",
  stuck: "Stuck",
  "not-started": "Not Started",
};

export default async function StudentDetailPage({ params, searchParams }: PageProps) {
  const professor = await getProfessorWithCourses();

  if (!professor) {
    redirect("/professor");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const studentId = resolvedParams.id;
  const courseId = resolvedSearchParams.courseId || professor.courses[0]?.id;

  if (!courseId) {
    notFound();
  }

  // Verify professor owns this course
  const ownsCourse = await verifyProfessorOwnsCourse(professor.id, courseId);
  if (!ownsCourse) {
    notFound();
  }

  const student = await getStudentDetail(courseId, studentId);

  if (!student) {
    notFound();
  }

  const currentCourse = professor.courses.find((c) => c.id === courseId);
  const completionRate = student.topicsStarted > 0
    ? Math.round((student.topicsMastered / student.topicsStarted) * 100)
    : 0;

  return (
    <div className="p-8">
      {/* Back link */}
      <Link
        href={`/professor/students?courseId=${courseId}`}
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Students
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-semibold text-xl">
            {student.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
              {student.email}
            </h1>
            <p className="text-stone-500 mt-1">
              {currentCourse?.code} • Enrolled {formatDate(student.enrolledAt)}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${healthStatusStyles[student.healthStatus]}`}>
          {healthStatusLabels[student.healthStatus]}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-4">
          <p className="text-sm text-stone-500 mb-1">Topics Started</p>
          <p className="text-2xl font-bold text-stone-900">{student.topicsStarted}</p>
        </div>
        <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-4">
          <p className="text-sm text-stone-500 mb-1">Topics Mastered</p>
          <p className="text-2xl font-bold text-stone-900">{student.topicsMastered}</p>
        </div>
        <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-4">
          <p className="text-sm text-stone-500 mb-1">Completion Rate</p>
          <p className="text-2xl font-bold text-stone-900">{completionRate}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-4">
          <p className="text-sm text-stone-500 mb-1">Total Messages</p>
          <p className="text-2xl font-bold text-stone-900">{student.totalMessages}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Topics */}
        <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
          <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Recent Topics</h2>
          {student.recentTopics.length === 0 ? (
            <p className="text-stone-500 text-sm">No topics started yet</p>
          ) : (
            <div className="space-y-3">
              {student.recentTopics.map((topic) => (
                <div
                  key={topic.topicId}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-stone-900">{topic.topicName}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyles[topic.status]}`}>
                    {statusLabels[topic.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Struggling With */}
        <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
          <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Struggling With</h2>
          {student.strugglingWith.length === 0 ? (
            <div className="text-center py-6 text-stone-500">
              <svg className="w-10 h-10 mx-auto mb-2 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No struggles detected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {student.strugglingWith.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg"
                >
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-red-800">{topic}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Last Active */}
      <div className="mt-6 text-sm text-stone-500">
        Last active: {formatDate(student.lastActive)}
      </div>
    </div>
  );
}
