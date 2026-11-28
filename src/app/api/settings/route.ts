import { NextRequest } from "next/server";
import { getSettings, updateSettings } from "@/lib/db";
import {
  adminActor,
  json,
  readBody,
  recordChange,
  refreshPublicPages,
  serverError,
  unauthorized,
} from "@/lib/admin-route";
import { parseInput, SETTINGS_SCHEMA } from "@/lib/validation";
import type { HotelSettings } from "@/lib/types";

// Hotel policies and privacy-notice facts (Admin → Settings). Admin only; guests see them on the public pages.
export async function GET() {
  if (!(await adminActor())) return unauthorized();
  try {
    return json(await getSettings());
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await adminActor();
  if (!actor) return unauthorized();
  try {
    const parsed = parseInput(SETTINGS_SCHEMA, await readBody(req), { partial: true });
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const item = await updateSettings(parsed.data as Partial<HotelSettings>);
    refreshPublicPages();
    await recordChange(actor, "update", "settings", "", { fields: Object.keys(parsed.data).sort() });
    return json({ item });
  } catch (error) {
    return serverError(error);
  }
}
