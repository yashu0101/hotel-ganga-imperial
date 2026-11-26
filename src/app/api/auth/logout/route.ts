import { NextResponse } from "next/server";
import { COOKIE_NAME, endAllSessions, verifySession } from "@/lib/auth";
import { logError } from "@/lib/log";

export async function POST() {
  // Only a signed-in admin can end sessions; otherwise anyone could sign staff out.
  // `revoked: false` tells the dashboard that other sessions (and copied tokens) may still be active. It is left out
  // when there was no valid session to begin with.
  let revoked: boolean | undefined;
  if ((await verifySession()).authenticated) {
    revoked = false;
    try {
      await endAllSessions();
      revoked = true;
    } catch (error) {
      logError("admin.logout_revoke_failed", error); // This browser's cookie is still cleared below.
    }
  }
  const res = NextResponse.json({ success: true, revoked });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}
