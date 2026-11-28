import { getBookings } from "@/lib/db";
import { adminActor, recordChange, serverError, shortReference, unauthorized } from "@/lib/admin-route";
import type { Booking } from "@/lib/types";

const HOTEL_TIME = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
/** "2026-11-28 16:00" in hotel time. */
const hotelTime = (iso: string) => {
  const parts = Object.fromEntries(HOTEL_TIME.formatToParts(new Date(iso)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};
/**
 * One CSV cell. Text a spreadsheet would run as a formula (starting with = + - @ or a control character) gets a
 * leading apostrophe; anything with a comma, semicolon (some locales' separator), quote or line break is quoted.
 */
export function csvCell(value: unknown) {
  let text = value === undefined || value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",;\r\n']/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}
const COLUMNS: [string, (b: Booking) => unknown][] = [
  ["Reference", b => shortReference(b.id)],
  ["Received", b => hotelTime(b.createdAt)],
  ["Name", b => b.name],
  ["Phone", b => b.mobile],
  ["Email", b => b.email],
  ["Request", b => b.roomType],
  ["Rooms", b => b.roomsRequested || ""],
  ["Check-in", b => b.checkin],
  ["Check-out", b => b.checkout],
  ["Guests", b => b.guests],
  ["Status", b => b.bookingStatus],
  ["Offer code", b => b.couponCode ?? ""],
  ["Special requests", b => b.specialRequests ?? ""],
  ["Added by", b => (b.source === "staff" ? "Staff" : "Website")],
];

// Every request not in Deleted, as a CSV file for a spreadsheet. Contains guest details: admin only, never cached.
export async function GET() {
  const actor = await adminActor();
  if (!actor) return unauthorized();
  try {
    const bookings = await getBookings();
    const lines = [COLUMNS.map(([title]) => title), ...bookings.map(b => COLUMNS.map(([, value]) => value(b)))].map(
      row => row.map(csvCell).join(","),
    );
    const day = hotelTime(new Date().toISOString()).slice(0, 10);
    await recordChange(actor, "export", "bookings", "", { count: bookings.length });
    // The byte-order mark makes Excel read the file as UTF-8 (₹, names in Hindi).
    return new Response("\uFEFF" + lines.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="requests-${day}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
