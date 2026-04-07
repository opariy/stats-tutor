import Link from "next/link";
import type { StudentSummary } from "@/lib/professor-metrics";

interface StudentListProps {
  students: StudentSummary[];
  courseId: string;
}

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

export default function StudentList({ students, courseId }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 p-6">
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Students</h2>
        <div className="text-center py-8 text-stone-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p>No students enrolled</p>
          <p className="text-sm mt-1">Enroll students to see their progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-soft-md border border-stone-200 overflow-hidden">
      <div className="p-6 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-stone-900">Students</h2>
          <span className="text-sm text-stone-500">{students.length} enrolled</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                Student
              </th>
              <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                Mastery
              </th>
              <th className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-medium text-sm">
                      {student.email[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-stone-900">
                      {student.email}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${healthStatusStyles[student.healthStatus]}`}>
                    {healthStatusLabels[student.healthStatus]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {student.topicsStarted === 0 ? (
                    <span className="text-sm text-stone-400 italic">No activity</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{
                            width: `${(student.topicsMastered / student.topicsStarted) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-stone-600">
                        {student.topicsMastered}/{student.topicsStarted} topics
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/professor/students/${student.id}?courseId=${courseId}`}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
