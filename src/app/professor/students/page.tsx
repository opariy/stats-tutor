import { getProfessorWithCourses } from "@/lib/professor-auth";
import { getStudentList } from "@/lib/professor-metrics";
import { redirect } from "next/navigation";
import StudentList from "../components/student-list";

interface PageProps {
  searchParams: Promise<{ courseId?: string }>;
}

export default async function StudentsPage({ searchParams }: PageProps) {
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
          <p className="text-stone-500">You don't have any courses set up yet.</p>
        </div>
      </div>
    );
  }

  const students = await getStudentList(courseId);
  const currentCourse = professor.courses.find((c) => c.id === courseId);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
          Students
        </h1>
        <p className="text-stone-500 mt-1">{currentCourse?.code} - {currentCourse?.name}</p>
      </div>

      <StudentList students={students} courseId={courseId} />
    </div>
  );
}
