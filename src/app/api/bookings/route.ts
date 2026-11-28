import { NextRequest } from "next/server";
import { addBooking, getBanquetPackages, getBookings, getRooms, updateBooking, deleteBooking } from "@/lib/db";
import { cleanText, contactError, resolveStay } from "@/lib/reservation";
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

/** What staff may send when adding a booking; anything else is rejected. */
const STAFF_BOOKING_FIELDS = new Set([
  "name",
  "mobile",
  "email",
  "city",
  "roomType",
  "roomId",
  "roomsRequested",
  "checkin",
  "checkout",
  "guests",
  "specialRequests",
  "bookingStatus",
]);

// Staff add a booking they took by phone or at the desk. Same rules as the website form, but it can be saved as
// confirmed, is marked as added by staff, and sends the guest no acknowledgement (staff are already talking to them).
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const b = await readBody(req);
    if (!b || typeof b !== "object" || Array.isArray(b)) return json({ error: "Invalid request." }, 400);
    const body = b as Record<string, unknown>;
    const unknown = Object.keys(body).find(key => !STAFF_BOOKING_FIELDS.has(key));
    if (unknown) return json({ error: `Unknown field: ${unknown}` }, 400);
    const status = body.bookingStatus ?? "confirmed";
    if (status !== "pending" && status !== "confirmed")
      return json({ error: "A new booking can only be pending or confirmed." }, 400);
    const name = cleanText(body.name, 100),
      mobile = cleanText(body.mobile, 30),
      email = cleanText(body.email, 150);
    const contactProblem = contactError({ name, mobile, email });
    if (contactProblem) return json({ error: contactProblem }, 400);
    const [rooms, packages] = await Promise.all([getRooms(), getBanquetPackages()]);
    const resolved = resolveStay(body, rooms, packages);
    if ("error" in resolved) return json({ error: resolved.error }, 400);
    const { stay } = resolved;
    const item = await addBooking(
      {
        name,
        mobile,
        email,
        city: cleanText(body.city, 100),
        country: "",
        gender: "other",
        roomType: stay.roomType,
        roomId: stay.roomId,
        checkin: stay.checkin,
        checkout: stay.checkout,
        guests: stay.guests,
        roomsRequested: stay.roomsRequested,
        specialRequests: cleanText(body.specialRequests, 500),
        amount: 0,
      },
      { status, source: "staff", notify: false },
    );
    return json({ item }, 201);
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
