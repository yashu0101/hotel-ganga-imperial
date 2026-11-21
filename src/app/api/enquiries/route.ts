import { NextRequest } from "next/server";
import { getEnquiries, updateEnquiryStatus, deleteEnquiry } from "@/lib/db";
import { isAdmin, json, readBody, serverError, unauthorized } from "@/lib/admin-route";
import { parseInput, ENQUIRY_UPDATE_SCHEMA } from "@/lib/validation";
import type { Enquiry } from "@/lib/types";

// Enquiries from the earlier enquiry form. New guest requests arrive as bookings.
export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    return json(await getEnquiries());
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const { id, ...updates } = ((await readBody(req)) || {}) as Record<string, unknown>;
    if (typeof id !== "string" || !id) return json({ error: "id required" }, 400);
    const parsed = parseInput(ENQUIRY_UPDATE_SCHEMA, updates);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const item = await updateEnquiryStatus(id, parsed.data.status as Enquiry["status"]);
    return item ? json({ item }) : json({ error: "Not found" }, 404);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return json({ error: "id required" }, 400);
    return (await deleteEnquiry(id)) ? json({ success: true }) : json({ error: "Not found" }, 404);
  } catch (error) {
    return serverError(error);
  }
}
