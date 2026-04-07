import { getProfessorWithCourses } from "@/lib/professor-auth";
import { getStuckPoints, getMisconceptions, getStudentList, getClassHealth } from "@/lib/professor-metrics";
import { redirect } from "next/navigation";
import ProfessorDashboard from "./professor-dashboard";

interface PageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function ProfessorPage({ searchParams }: PageProps) {
  const professor = await getProfessorWithCourses();

  if (!professor) {
    redirect("/professor");
  }

  const resolvedParams = await searchParams;
  const courseId = resolvedParams.courseId || professor.courses[0]?.id;

  if (!courseId) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center py-16">
          <h1 className="font-display text-2xl font-bold text-stone-900 mb-4">No Courses Found</h1>
          <p className="text-stone-500">You don't have any courses set up yet. Contact support to create your first course.</p>
        </div>
      </div>
    );
  }

  // Fetch all data in parallel
  const [stuckPoints, misconceptions, students, classHealth] = await Promise.all([
    getStuckPoints(courseId, 7, false),
    getMisconceptions(courseId),
    getStudentList(courseId),
    getClassHealth(courseId),
  ]);

  // Find current course name
  const currentCourse = professor.courses.find((c) => c.id === courseId);

  return (
    <ProfessorDashboard
      courseName={currentCourse?.name || "Course"}
      courseCode={currentCourse?.code || ""}
      courseId={courseId}
      stuckPoints={stuckPoints}
      misconceptions={misconceptions}
      students={students}
      classHealth={classHealth}
    />
  );
}
