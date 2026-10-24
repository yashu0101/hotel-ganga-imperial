import { NextRequest, NextResponse } from "next/server";
import { createSession, getAdminCredentials, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const admin = getAdminCredentials();

    if (email !== admin.email || password !== admin.password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await createSession(email);

    const res = NextResponse.json({ success: true, email });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Server error." },
      { status: 500 }
    );
  }
}
