import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth";
import { StorageUnavailableError } from "@/lib/db";
import { parseInput, type Schema } from "@/lib/validation";
import { logError } from "@/lib/log";

// Shared handlers for admin-managed collections. Every write requires an admin session and is
// validated against the collection's schema (unknown fields are rejected). Successful writes
// refresh the statically generated public pages. Responses: POST/PATCH { item }, DELETE { success }.
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const unauthorized = () => json({ error: "Unauthorized" }, 401);
export const isAdmin = async () => (await verifySession()).authenticated;
export async function readBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
export function serverError(error: unknown) {
  logError("admin.request_failed", error);
  if (error instanceof StorageUnavailableError) return json({ error: error.message }, 503);
  return json({ error: "Server error" }, 500);
}
export const refreshPublicPages = () => revalidatePath("/", "layout");

interface Collection<T> {
  schema: Schema;
  list: () => Promise<T[]>;
  add: (data: never) => Promise<T>;
  update: (id: string, data: never) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
  /** Unauthenticated GET returns only what guests may see; omit to make GET admin-only. */
  publicFilter?: (item: T) => boolean;
}

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
      if (!(await isAdmin())) return unauthorized();
      try {
        const parsed = parseInput(c.schema, await readBody(req));
        if (!parsed.ok) return json({ error: parsed.error }, 400);
        const item = await c.add(parsed.data as never);
        refreshPublicPages();
        return json({ item }, 201);
      } catch (error) {
        return serverError(error);
      }
    },
    async PATCH(req: NextRequest) {
      if (!(await isAdmin())) return unauthorized();
      try {
        const body = await readBody(req);
        const { id, ...updates } = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
        if (typeof id !== "string" || !id) return json({ error: "id required" }, 400);
        const parsed = parseInput(c.schema, updates, { partial: true });
        if (!parsed.ok) return json({ error: parsed.error }, 400);
        const item = await c.update(id, parsed.data as never);
        if (!item) return json({ error: "Not found" }, 404);
        refreshPublicPages();
        return json({ item });
      } catch (error) {
        return serverError(error);
      }
    },
    async DELETE(req: NextRequest) {
      if (!(await isAdmin())) return unauthorized();
      try {
        const id = new URL(req.url).searchParams.get("id");
        if (!id) return json({ error: "id required" }, 400);
        if (!(await c.remove(id))) return json({ error: "Not found" }, 404);
        refreshPublicPages();
        return json({ success: true });
      } catch (error) {
        return serverError(error);
      }
    },
  };
}
