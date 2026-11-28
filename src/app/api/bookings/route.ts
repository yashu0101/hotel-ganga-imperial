import { NextRequest } from "next/server";
import {
  addBooking,
  getBanquetPackages,
  getBookings,
  getOffers,
  getRooms,
  updateBooking,
  deleteBooking,
  eraseBooking,
  restoreBooking,
  type BookingQuery,
} from "@/lib/db";
import { cleanText, contactError, normalizeCoupon, resolveCoupon, resolveStay } from "@/lib/reservation";
import { adminActor, json, readBody, recordChange, serverError, shortReference, unauthorized } from "@/lib/admin-route";
import { parseInput, BOOKING_UPDATE_SCHEMA } from "@/lib/validation";
import type { Booking } from "@/lib/types";

const DAY = /^\d{4}-\d{2}-\d{2}$/,
  ID = /^[\w-]{1,80}$/,
  MOMENT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
/**
 * The dashboard loads requests in pages: ?since=YYYY-MM-DD gives recent and still-open requests, then
 * ?before=<ISO time>&limit=N gives older ones, newest first. ?deleted=1 lists the requests in Deleted.
 */
function bookingQuery(params: URLSearchParams): BookingQuery | null {
  if (params.get("deleted") === "1") return { deleted: true };
  const since = params.get("since"),
    before = params.get("before"),
    beforeId = params.get("beforeId"),
    limit = params.get("limit"),
    staysFrom = params.get("staysFrom"),
    staysTo = params.get("staysTo");
  const day = (value: string | null): value is string => !!value && DAY.test(value) && !Number.isNaN(Date.parse(value));
  if (staysFrom !== null || staysTo !== null)
    return day(staysFrom) && day(staysTo) && staysFrom <= staysTo ? { staysFrom, staysTo } : null;
  if (since !== null) return DAY.test(since) && !Number.isNaN(Date.parse(since)) ? { since } : null;
  if (before !== null) {
    const size = limit === null ? 200 : Number(limit);
    if (!MOMENT.test(before) || Number.isNaN(Date.parse(before))) return null;
    if (!Number.isInteger(size) || size < 1 || size > 500) return null;
    if (beforeId !== null && !ID.test(beforeId)) return null;
    // One form for both backends: Postgres compares times, the JSON file compares ISO text.
    return { before: new Date(before).toISOString(), ...(beforeId ? { beforeId } : {}), limit: size };
  }
  return {};
}

export async function GET(req: NextRequest) {
  if (!(await adminActor())) return unauthorized();
  try {
    const query = bookingQuery(new URL(req.url).searchParams);
    if (!query) return json({ error: "Invalid paging parameters." }, 400);
    return json(await getBookings(query));
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
  "couponCode",
  "bookingStatus",
]);

// Staff add a booking they took by phone or at the desk. Same rules as the website form, but it can be saved as
// confirmed, is marked as added by staff, and sends the guest no acknowledgement (staff are already talking to them).
export async function POST(req: NextRequest) {
  const actor = await adminActor();
  if (!actor) return unauthorized();
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
    // An offer the guest quoted by phone follows the website's rule: an active offer that is valid today.
    const couponCode = normalizeCoupon(body.couponCode);
    const offer = couponCode ? resolveCoupon(await getOffers(), couponCode, undefined, stay) : null;
    if (offer && "error" in offer) return json({ error: offer.error }, 400);
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
        couponCode: offer?.coupon.code ?? "",
        couponOffer: offer?.coupon.title ?? "",
        amount: 0,
      },
      { status, source: "staff", notify: false },
    );
    await recordChange(actor, "create", "bookings", item.id, { reference: shortReference(item.id), status });
    return json({ item }, 201);
  } catch (error) {
    return serverError(error);
  }
}

// Staff can change the status of a request, or bring one back from Deleted with { id, restore: true }.
export async function PATCH(req: NextRequest) {
  const actor = await adminActor();
  if (!actor) return unauthorized();
  try {
    const body = await readBody(req);
    const { id, ...updates } = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
    if (typeof id !== "string" || !id) return json({ error: "id required" }, 400);
    if ("restore" in updates) {
      if (updates.restore !== true || Object.keys(updates).length > 1) return json({ error: "Invalid restore." }, 400);
      if (!(await restoreBooking(id))) return json({ error: "Not found" }, 404);
      await recordChange(actor, "restore", "bookings", id, { reference: shortReference(id) });
      return json({ success: true });
    }
    const parsed = parseInput(BOOKING_UPDATE_SCHEMA, updates);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const item = await updateBooking(id, parsed.data as Pick<Booking, "bookingStatus">);
    if (!item) return json({ error: "Not found" }, 404);
    await recordChange(actor, "status", "bookings", id, {
      reference: shortReference(id),
      status: item.bookingStatus,
    });
    return json({ item });
  } catch (error) {
    return serverError(error);
  }
}

// Deleting moves a request to Deleted (restorable for 30 days). ?permanent=1 erases one that is already there, for
// example when a guest asks for their data to be erased.
export async function DELETE(req: NextRequest) {
  const actor = await adminActor();
  if (!actor) return unauthorized();
  try {
    const params = new URL(req.url).searchParams;
    const id = params.get("id");
    if (!id) return json({ error: "id required" }, 400);
    const permanent = params.get("permanent") === "1";
    if (!(await (permanent ? eraseBooking(id) : deleteBooking(id)))) return json({ error: "Not found" }, 404);
    await recordChange(actor, permanent ? "erase" : "delete", "bookings", id, { reference: shortReference(id) });
    return json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
