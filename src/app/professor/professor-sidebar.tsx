"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";

interface Course {
  id: string;
  name: string;
  code: string;
}

interface ProfessorSidebarProps {
  professorName: string;
  courses: Course[];
}

const navItems = [
  {
    name: "Dashboard",
    href: "/professor",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: "Students",
    href: "/professor/students",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default function ProfessorSidebar({ professorName, courses }: ProfessorSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCourseId = searchParams.get("courseId") || courses[0]?.id;

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    const url = new URL(window.location.href);
    url.searchParams.set("courseId", courseId);
    window.location.href = url.toString();
  };

  return (
    <aside className="w-[280px] bg-white border-r border-stone-200 min-h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-stone-200">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"
            alt="Krokyo"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <div>
            <h1 className="font-display text-xl font-bold text-stone-900 tracking-tight group-hover:text-teal-700 transition-colors">Krokyo</h1>
            <span className="text-xs text-stone-500 font-medium">Professor Dashboard</span>
          </div>
        </Link>
      </div>

      {/* Course Selector */}
      {courses.length > 0 && (
        <div className="p-4 border-b border-stone-200">
          <label htmlFor="course-select" className="block text-xs font-medium text-stone-500 mb-1.5">
            Course
          </label>
          <select
            id="course-select"
            value={currentCourseId}
            onChange={handleCourseChange}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === "/professor"
              ? pathname === "/professor"
              : pathname.startsWith(item.href);

            const href = currentCourseId
              ? `${item.href}?courseId=${currentCourseId}`
              : item.href;

            return (
              <li key={item.name}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <span className={isActive ? "text-teal-600" : "text-stone-400"}>
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-stone-200">
        <div className="px-4 py-2 text-sm text-stone-500">
          <span className="font-medium text-stone-700">{professorName}</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back to App
        </Link>
      </div>
    </aside>
  );
}
