import { db, courses } from "@/lib/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import JoinForm from "./join-form";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function JoinPage({ params }: PageProps) {
  const { code } = await params;

  // Find course by code
  const course = await db.query.courses.findFirst({
    where: eq(courses.code, code),
    with: {
      professor: true,
    },
  });

  if (!course) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft-md">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
            Join {course.code}
          </h1>
          <p className="text-stone-600 mt-2">{course.name}</p>
          <p className="text-stone-500 text-sm mt-1">
            Taught by {course.professor?.name || "Professor"}
          </p>
        </div>

        <JoinForm courseCode={code} courseName={course.name} />
      </div>
    </div>
  );
}
