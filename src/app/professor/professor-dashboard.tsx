import StuckPointsCard from "./components/stuck-points-card";
import MisconceptionHeatmap from "./components/misconception-heatmap";
import StudentList from "./components/student-list";
import ClassHealthCard from "./components/class-health";
import EnrollmentLinkBanner from "./components/enrollment-link-banner";
import type { StuckPoint, MisconceptionData, StudentSummary, ClassHealth } from "@/lib/professor-metrics";

interface ProfessorDashboardProps {
  courseName: string;
  courseCode: string;
  courseId: string;
  stuckPoints: StuckPoint[];
  misconceptions: MisconceptionData[];
  students: StudentSummary[];
  classHealth: ClassHealth;
}

export default function ProfessorDashboard({
  courseName,
  courseCode,
  courseId,
  stuckPoints,
  misconceptions,
  students,
  classHealth,
}: ProfessorDashboardProps) {
  return (
    <div className="p-8">
      {/* Enrollment Link Banner */}
      <EnrollmentLinkBanner courseCode={courseCode} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
          {courseCode} Dashboard
        </h1>
        <p className="text-stone-500 mt-1">{courseName}</p>
      </div>

      {/* Class Health Overview */}
      <ClassHealthCard classHealth={classHealth} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Stuck Points */}
        <StuckPointsCard stuckPoints={stuckPoints} courseId={courseId} />

        {/* Misconception Heat Map */}
        <MisconceptionHeatmap misconceptions={misconceptions} />
      </div>

      {/* Student List */}
      <div className="mt-6">
        <StudentList
          students={students}
          courseId={courseId}
        />
      </div>
    </div>
  );
}
