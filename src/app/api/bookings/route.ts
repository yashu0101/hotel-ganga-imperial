import { NextRequest } from "next/server";
import { getBookings, updateBooking, deleteBooking } from "@/lib/db";
import { isAdmin, json, readBody, serverError, unauthorized } from "@/lib/admin-route";
import { parseInput, BOOKING_UPDATE_SCHEMA } from "@/lib/validation";
import type { Booking } from "@/lib/types";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    return json(await getBookings());
  } catch (error) {
    return serverError(error);
  }
}

// Staff can only change the status of a request.
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const { id, ...updates } = ((await readBody(req)) || {}) as Record<string, unknown>;
    if (typeof id !== "string" || !id) return json({ error: "id required" }, 400);
    const parsed = parseInput(BOOKING_UPDATE_SCHEMA, updates);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const item = await updateBooking(id, parsed.data as Pick<Booking, "bookingStatus">);
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
    return (await deleteBooking(id)) ? json({ success: true }) : json({ error: "Not found" }, 404);
  } catch (error) {
    return serverError(error);
  }
}
