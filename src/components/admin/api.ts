// Admin fetch helper. Throws with the server's message on any non-2xx response, so callers
// only update what they show after the server has confirmed the change.
/** Dispatched on a 401 so the dashboard can send the user back to the sign-in page. */
export const SESSION_EXPIRED = "admin-session-expired";

export async function adminRequest<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED));
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export type Notify = (message: string, kind?: "ok" | "error") => void;
