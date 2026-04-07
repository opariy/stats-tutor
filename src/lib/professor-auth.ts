import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db, professors, courses } from "./db";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;
const COOKIE_NAME = "professor_session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getProfessorFromSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    // Session token is the professor ID
    const professor = await db.query.professors.findFirst({
      where: eq(professors.id, sessionToken),
    });

    return professor || null;
  } catch {
    return null;
  }
}

export async function getProfessorWithCourses() {
  const professor = await getProfessorFromSession();
  if (!professor) {
    return null;
  }

  const professorCourses = await db.query.courses.findMany({
    where: eq(courses.professorId, professor.id),
  });

  return {
    ...professor,
    courses: professorCourses,
  };
}

export async function isProfessorAuthenticated(): Promise<boolean> {
  const professor = await getProfessorFromSession();
  return professor !== null;
}

export async function verifyProfessorOwnsCourse(
  professorId: string,
  courseId: string
): Promise<boolean> {
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  });

  return course?.professorId === professorId;
}

export function setProfessorSession(professorId: string) {
  return {
    name: COOKIE_NAME,
    value: professorId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  };
}

export function clearProfessorSession() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}
