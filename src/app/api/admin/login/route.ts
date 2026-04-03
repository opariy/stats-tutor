import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const expected = process.env.ADMIN_PASSWORD;
  console.log("=== ADMIN LOGIN DEBUG ===");
  console.log("Received:", JSON.stringify(password));
  console.log("Expected:", JSON.stringify(expected));
  console.log("Match:", password === expected);
  console.log("=========================");

  if (password === process.env.ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("admin_token", password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
