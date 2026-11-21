// Best-effort, per-process abuse protection. With several instances, add a shared limiter at the
// hosting edge (e.g. Vercel Firewall rate limiting) as well.
//
// Keys are based on the client address supplied by the hosting proxy, never on form fields,
// so changing the phone number or email does not bypass a limit, and nobody can lock another
// guest out by submitting with their details. When the table is full the oldest entries are
// evicted; it never refuses everyone.
const MAX_KEYS = 10_000;
const attempts = new Map<string, { count: number; expires: number }>();

function entry(key: string, windowMs: number) {
  const now = Date.now();
  let e = attempts.get(key);
  if (e && e.expires <= now) {
    attempts.delete(key);
    e = undefined;
  }
  if (!e) {
    if (attempts.size >= MAX_KEYS) {
      for (const [k, v] of attempts) if (v.expires <= now) attempts.delete(k);
      while (attempts.size >= MAX_KEYS) attempts.delete(attempts.keys().next().value!);
    }
    e = { count: 0, expires: now + windowMs };
    attempts.set(key, e);
  }
  return e;
}

/** Count one request against `key`; false once `limit` requests were made in the window. */
export function allowRequest(key: string, limit = 5, windowMs = 600_000) {
  const e = entry(key, windowMs);
  if (e.count >= limit) return false;
  e.count++;
  return true;
}

/** Client address from the hosting proxy. On Vercel x-forwarded-for is set by the platform. */
export function clientKey(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || headers.get("x-real-ip")?.trim() || "unknown";
}

// Logins: only failures count. Per address (stops one attacker quickly) and a much higher
// per-account ceiling (slows distributed guessing without letting one address lock staff out).
const LOGIN_WINDOW = 15 * 60_000,
  PER_ADDRESS = 10,
  PER_ACCOUNT = 50;
const peek = (key: string) => {
  const e = attempts.get(key);
  return e && e.expires > Date.now() ? e.count : 0;
};
export function loginAllowed(address: string, account: string) {
  return peek("login-ip:" + address) < PER_ADDRESS && peek("login-account:" + account.toLowerCase()) < PER_ACCOUNT;
}
export function recordLoginFailure(address: string, account: string) {
  entry("login-ip:" + address, LOGIN_WINDOW).count++;
  entry("login-account:" + account.toLowerCase(), LOGIN_WINDOW).count++;
}
export function recordLoginSuccess(address: string) {
  attempts.delete("login-ip:" + address);
}
