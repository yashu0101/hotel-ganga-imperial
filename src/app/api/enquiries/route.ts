import { NextRequest } from "next/server";
import { getEnquiries, updateEnquiryStatus, deleteEnquiry, eraseEnquiry, restoreEnquiry } from "@/lib/db";
import { adminActor, json, readBody, recordChange, serverError, shortReference, unauthorized } from "@/lib/admin-route";
import { parseInput, ENQUIRY_UPDATE_SCHEMA } from "@/lib/validation";
import type { Enquiry } from "@/lib/types";

// Enquiries from the earlier enquiry form. New guest requests arrive as bookings. ?deleted=1 lists the ones in Deleted.
export async function GET(req?: NextRequest) {
  if (!(await adminActor())) return unauthorized();
  try {
    const deleted = req ? new URL(req.url).searchParams.get("deleted") === "1" : false;
    return json(await getEnquiries({ deleted }));
  } catch (error) {
    return serverError(error);
  }
}

// Staff can change an enquiry's status, or bring one back from Deleted with { id, restore: true }.
export async function PATCH(req: NextRequest) {
  const actor = await adminActor();
  if (!actor) return unauthorized();
  try {
    const body = await readBody(req);
    const { id, ...updates } = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    if (typeof id !== "string" || !id) return json({ error: "id required" }, 400);
    if ("restore" in updates) {
      if (updates.restore !== true || Object.keys(updates).length > 1) return json({ error: "Invalid restore." }, 400);
      if (!(await restoreEnquiry(id))) return json({ error: "Not found" }, 404);
      await recordChange(actor, "restore", "enquiries", id, { reference: shortReference(id) });
      return json({ success: true });
    }
    const parsed = parseInput(ENQUIRY_UPDATE_SCHEMA, updates);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const item = await updateEnquiryStatus(id, parsed.data.status as Enquiry["status"]);
    if (!item) return json({ error: "Not found" }, 404);
    await recordChange(actor, "status", "enquiries", id, { reference: shortReference(id), status: item.status });
    return json({ item });
  } catch (error) {
    return serverError(error);
  }
}

// Deleting moves an enquiry to Deleted (restorable for 30 days); ?permanent=1 erases one that is already there.
export async function DELETE(req: NextRequest) {
  const actor = await adminActor();
  if (!actor) return unauthorized();
  try {
    const params = new URL(req.url).searchParams;
    const id = params.get("id");
    if (!id) return json({ error: "id required" }, 400);
    const permanent = params.get("permanent") === "1";
    if (!(await (permanent ? eraseEnquiry(id) : deleteEnquiry(id)))) return json({ error: "Not found" }, 404);
    await recordChange(actor, permanent ? "erase" : "delete", "enquiries", id, { reference: shortReference(id) });
    return json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
