import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { clientKey, loginAllowed, recordLoginFailure, recordLoginSuccess } from "@/lib/request-limit";
import { createSession, getAdminCredentials, COOKIE_NAME } from "@/lib/auth";

// Constant-time comparison (hashing first makes the lengths equal).
const same = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password ||
      email.length > 150 ||
      password.length > 256
    ) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    const address = clientKey(req.headers);
    if (!loginAllowed(address, email.trim()))
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    const admin = getAdminCredentials();
    if (!admin.email || !admin.password || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return NextResponse.json(
        { error: "Admin access is not configured. Contact the site administrator." },
        { status: 503 },
      );
    }
    const emailMatches = same(email.trim().toLowerCase(), admin.email.trim().toLowerCase());
    const passwordMatches = same(password, admin.password); // Always computed, so timing does not reveal which part failed.
    if (!emailMatches || !passwordMatches) {
      recordLoginFailure(address, email.trim());
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    recordLoginSuccess(address);

    const res = NextResponse.json({ success: true, email: admin.email });
    res.cookies.set(COOKIE_NAME, await createSession(admin.email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
