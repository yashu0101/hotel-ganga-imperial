import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function signingKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
}
const COOKIE_NAME = "admin_session";

export async function createSession(email: string) {
  const token = await new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
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
    return { authenticated: payload.role === "admin" && typeof payload.email === "string", email: payload.email as string };
  } catch {
    return { authenticated: false };
  }
}

export function getAdminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };
}

export { COOKIE_NAME };
