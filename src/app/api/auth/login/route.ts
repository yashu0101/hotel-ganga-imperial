import { allowRequest } from "@/lib/request-limit";
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

    if (typeof email !== "string" || typeof password !== "string" || email.length > 150 || password.length > 256) return NextResponse.json({error:"Invalid credentials."},{status:400});
    if (!allowRequest("login:"+email.trim().toLowerCase(), 10)) return NextResponse.json({error:"Too many attempts. Please try again later."},{status:429});
    const admin = getAdminCredentials();
    if (!admin.email || !admin.password || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return NextResponse.json({ error: "Admin access is not configured. Contact the site administrator." }, { status: 503 });
    }

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
