import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth";
import { addAuditEntry, ConflictError, StorageUnavailableError } from "@/lib/db";
import { parseInput, type Schema } from "@/lib/validation";
import { logError } from "@/lib/log";

// Shared handlers for admin-managed collections. Every write requires an admin session and is
// validated against the collection's schema (unknown fields are rejected). Successful writes
// refresh the statically generated public pages. Responses: POST/PATCH { item }, DELETE { success }.
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const unauthorized = () => json({ error: "Unauthorized" }, 401);
/** The signed-in staff account, or null. */
export async function adminActor(): Promise<string | null> {
  const session = await verifySession();
  return session.authenticated ? session.email || "admin" : null;
}
export const isAdmin = async () => (await adminActor()) !== null;
/** A request's short reference as staff and guests see it. The activity log uses it instead of guest details. */
export const shortReference = (id: string) => id.slice(0, 8).toUpperCase();
/**
 * Add an entry to the activity log. Best effort: the change itself is already saved, so a failure here is logged
 * rather than reported to staff as if the change had failed.
 */
export interface ChangeDetails {
  /** A room, offer, package or option name as staff entered it. Never a guest's name. */
  label?: string;
  /** A request's short reference. */
  reference?: string;
  /** Changed field keys; the admin shows them as field labels in its language. */
  fields?: string[];
  /** A status key, e.g. "confirmed". */
  status?: string;
  count?: number;
}
export async function recordChange(
  actor: string,
  action: string,
  target: string,
  targetId = "",
  details: ChangeDetails = {},
) {
  // Stored as JSON so the admin can show it in English or Hindi.
  const summary = Object.keys(details).length ? JSON.stringify(details) : "";
  try {
    await addAuditEntry({ actor, action, target, targetId, summary });
  } catch (error) {
    logError("admin.audit_failed", error, { action, target });
  }
}
export async function readBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
export function serverError(error: unknown) {
  // A conflict staff can fix in the form, not a server fault.
  if (error instanceof ConflictError) return json({ error: error.message }, 409);
  logError("admin.request_failed", error);
  if (error instanceof StorageUnavailableError) return json({ error: error.message }, 503);
  return json({ error: "Server error" }, 500);
}
export const refreshPublicPages = () => revalidatePath("/", "layout");

interface Collection<T> {
  /** Names the collection in the activity log, e.g. "offers". */
  name: string;
  /** false when item names are personal data (a reviewer's name): the log then shows the id only. */
  logNames?: boolean;
  schema: Schema;
  list: () => Promise<T[]>;
  add: (data: never) => Promise<T>;
  update: (id: string, data: never) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
  /** Unauthenticated GET returns only what guests may see; omit to make GET admin-only. */
  publicFilter?: (item: T) => boolean;
}

/** How an item is named in the activity log: its title or name. */
const itemLabel = (item: unknown) => {
  const record = (item ?? {}) as { title?: unknown; name?: unknown };
  return String(record.title ?? record.name ?? "");
};
const itemId = (item: unknown) => String((item as { id?: unknown })?.id ?? "");

export function adminCollectionRoute<T>(c: Collection<T>) {
  return {
    async GET() {
      const admin = await isAdmin();
      if (!admin && !c.publicFilter) return unauthorized();
      try {
        const items = await c.list();
        return json(admin ? items : items.filter(c.publicFilter!));
      } catch (error) {
        return serverError(error);
      }
    },
    async POST(req: NextRequest) {
      const actor = await adminActor();
      if (!actor) return unauthorized();
      try {
        const parsed = parseInput(c.schema, await readBody(req));
        if (!parsed.ok) return json({ error: parsed.error }, 400);
        const item = await c.add(parsed.data as never);
        refreshPublicPages();
        await recordChange(
          actor,
          "create",
          c.name,
          itemId(item),
          c.logNames === false ? {} : { label: itemLabel(item) },
        );
        return json({ item }, 201);
      } catch (error) {
        return serverError(error);
      }
    },
    async PATCH(req: NextRequest) {
      const actor = await adminActor();
      if (!actor) return unauthorized();
      try {
        const body = await readBody(req);
        const { id, ...updates } = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
        if (typeof id !== "string" || !id) return json({ error: "id required" }, 400);
        const parsed = parseInput(c.schema, updates, { partial: true });
        if (!parsed.ok) return json({ error: parsed.error }, 400);
        const item = await c.update(id, parsed.data as never);
        if (!item) return json({ error: "Not found" }, 404);
        refreshPublicPages();
        await recordChange(actor, "update", c.name, id, {
          ...(c.logNames === false ? {} : { label: itemLabel(item) }),
          fields: Object.keys(parsed.data).sort(),
        });
        return json({ item });
      } catch (error) {
        return serverError(error);
      }
    },
    async DELETE(req: NextRequest) {
      const actor = await adminActor();
      if (!actor) return unauthorized();
      try {
        const id = new URL(req.url).searchParams.get("id");
        if (!id) return json({ error: "id required" }, 400);
        if (!(await c.remove(id))) return json({ error: "Not found" }, 404);
        refreshPublicPages();
        await recordChange(actor, "delete", c.name, id);
        return json({ success: true });
      } catch (error) {
        return serverError(error);
      }
    },
  };
}
