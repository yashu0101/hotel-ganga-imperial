// Basic per-process abuse protection. Use a shared limiter at the hosting edge for multiple instances.
const attempts = new Map<string, { count: number; expires: number }>();
export function allowRequest(key: string, limit = 5, windowMs = 600_000) {
  const now = Date.now();
  for (const [id, value] of attempts) if (value.expires <= now) attempts.delete(id);
  const entry = attempts.get(key);
  if (entry && entry.count >= limit) return false;
  if (entry) entry.count++;
  else { if (attempts.size >= 10_000) return false; attempts.set(key, { count: 1, expires: now + windowMs }); }
  return true;
}
