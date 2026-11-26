import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { bumpSessionVersion, getSessionVersion } from "@/lib/db";

function signingKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
}
const COOKIE_NAME = "admin_session";
/** One working shift. Signing out ends every session sooner (see endAllSessions). */
const SESSION_SECONDS = 8 * 60 * 60;

export async function createSession(email: string) {
  const token = await new SignJWT({ email, role: "admin", v: await getSessionVersion() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
    .setIssuedAt()
    .sign(signingKey());
  return token;
}

export async function verifySession(): Promise<{
  authenticated: boolean;
  email?: string;
}> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return { authenticated: false };

    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    // A token from before the last sign-out carries an older version and is no longer accepted.
    const current = payload.v === (await getSessionVersion());
    return {
      authenticated: current && payload.role === "admin" && typeof payload.email === "string",
      email: payload.email as string,
    };
  } catch {
    return { authenticated: false };
  }
}

/** Sign out everywhere: every existing session token (including copied ones) stops working. */
export async function endAllSessions() {
  await bumpSessionVersion();
}

export function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };
}

export { COOKIE_NAME, SESSION_SECONDS };
