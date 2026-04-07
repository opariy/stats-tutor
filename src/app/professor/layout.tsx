import { getProfessorWithCourses } from "@/lib/professor-auth";
import ProfessorSidebar from "./professor-sidebar";
import ProfessorLogin from "./professor-login";

export default async function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const professor = await getProfessorWithCourses();

  if (!professor) {
    return <ProfessorLogin />;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <ProfessorSidebar
        professorName={professor.name}
        courses={professor.courses}
      />
      <main className="ml-[280px]">
        {children}
      </main>
    </div>
  );
}
