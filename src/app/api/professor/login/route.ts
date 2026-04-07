import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, professors } from "@/lib/db";
import { eq } from "drizzle-orm";
import { verifyPassword, setProfessorSession } from "@/lib/professor-auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find professor by email
    const professor = await db.query.professors.findFirst({
      where: eq(professors.email, email.toLowerCase()),
    });

    if (!professor) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, professor.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Set session cookie
    const cookieStore = await cookies();
    const sessionCookie = setProfessorSession(professor.id);
    cookieStore.set(
      sessionCookie.name,
      sessionCookie.value,
      {
        httpOnly: sessionCookie.httpOnly,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite,
        maxAge: sessionCookie.maxAge,
        path: sessionCookie.path,
      }
    );

    return NextResponse.json({
      success: true,
      professor: {
        id: professor.id,
        email: professor.email,
        name: professor.name,
      },
    });
  } catch (error) {
    console.error("Professor login error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
