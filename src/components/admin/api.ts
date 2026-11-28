// Admin fetch helper. Throws with the server's message on any non-2xx response, so callers
// only update what they show after the server has confirmed the change.
/** Dispatched on a 401 so the dashboard can send the user back to the sign-in page. */
export const SESSION_EXPIRED = "admin-session-expired";

/** A failure the dashboard words itself (offline, session ended, server fault): `key` is its admin translation. */
export class AdminRequestError extends Error {
  constructor(
    readonly key: string,
    message: string,
  ) {
    super(message);
    this.name = "AdminRequestError";
  }
}

export async function adminRequest<T = unknown>(url: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // The browser's own text ("Failed to fetch") means nothing to staff.
    throw new AdminRequestError("admin.networkError", "Couldn't reach the server. Check the connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED));
    throw new AdminRequestError("admin.sessionExpired", "Your session has expired. Please sign in again.");
  }
  if (!res.ok) {
    // The server's message explains a refused change (e.g. a code already in use); without one, say it failed.
    const message = (data as { error?: string }).error;
    if (message) throw new Error(message);
    throw new AdminRequestError("admin.requestFailed", `Request failed (${res.status}). Please try again.`);
  }
  return data as T;
}

/** What to show staff for a failed request: the dashboard's own wording in their language, else the server's. */
export function errorText(t: (key: string) => string, error: unknown) {
  if (error instanceof AdminRequestError) return t(error.key);
  return error instanceof Error ? error.message : String(error);
}

export type Notify = (message: string, kind?: "ok" | "error") => void;
