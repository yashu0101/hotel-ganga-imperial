export function hotelToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function dateError(checkin: unknown, checkout: unknown, overnight: boolean) {
  if (!validDate(checkin) || checkin < hotelToday()) return "Choose a valid arrival or event date today or later.";
  if (overnight && !checkout) return "Choose a check-out date.";
  if (checkout && (!validDate(checkout) || checkout <= checkin))
    return "The end date must be after the arrival or event date.";
  return "";
}
/** Same rule in the browser and on the server: 10–15 digits, with only + space ( ) - as separators. */
export const PHONE_MAX_LENGTH = 25;
export function phoneError(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "Enter your phone number.";
  const digits = text.replace(/\D/g, "").length;
  if (text.length > PHONE_MAX_LENGTH || !/^\+?[0-9 ()-]+$/.test(text) || digits < 10 || digits > 15)
    return "Enter a phone number with 10 to 15 digits, including the country code (for example +91 98765 43210).";
  return "";
}
/** "Sat, 5 Dec, 2026" for an ISO date (YYYY-MM-DD); returns the input unchanged if it is not one. */
export function displayDate(iso: string, withYear = true) {
  if (!validDate(iso)) return iso;
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}
export function cleanText(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function nightlyRate(value: string): number | null {
  const match = value.match(/^\s*(?:₹|INR\s*)?(\d[\d,]*(?:\.\d{1,2})?)(?:\s*\/\s*night|\s+per\s+night)?\s*$/i);
  if (!match) return null;
  const rate = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

type CouponOffer = {
  title: string;
  discount: string;
  code?: string;
  validFrom: string;
  validTo: string;
  active: boolean;
};
export const normalizeCoupon = (value: unknown) => cleanText(value, 30).toUpperCase();
/** An active offer whose code matches (case-insensitive) and whose validity window includes `today`. */
export function findCoupon<T extends CouponOffer>(offers: T[], code: string, today = hotelToday()): T | null {
  const wanted = normalizeCoupon(code);
  if (!wanted) return null;
  return (
    offers.find(
      o =>
        o.active &&
        normalizeCoupon(o.code) === wanted &&
        (!o.validFrom || o.validFrom <= today) &&
        (!o.validTo || today <= o.validTo),
    ) ?? null
  );
}
/** Percentage from an offer's badge text such as "20%" or "Save 15% off"; 0 when it is not a percentage. */
export function couponPercent(offer: Pick<CouponOffer, "discount">) {
  const pct = Number(offer.discount.match(/(\d{1,2})\s*%/)?.[1] ?? 0);
  return pct > 0 && pct < 100 ? pct : 0;
}
export interface Coupon {
  code: string;
  /** The offer's title. */
  title: string;
  /** From the offer's badge; 0 when it is not a percentage. */
  percent: number;
}
/**
 * What an entered offer code means, for the website form and staff alike: null when none was entered, otherwise the
 * matching current offer or an error to show.
 */
export function resolveCoupon(
  offers: CouponOffer[],
  entered: unknown,
  today = hotelToday(),
): null | { error: string } | { coupon: Coupon } {
  const code = normalizeCoupon(entered);
  if (!code) return null;
  const offer = findCoupon(offers, code, today);
  if (!offer) return { error: "That offer code is not valid or has expired." };
  return { coupon: { code, title: offer.title, percent: couponPercent(offer) } };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The guest's name, phone and optional email: "" when valid, otherwise the message to show. */
export function contactError({ name, mobile, email }: { name: string; mobile: string; email: string }) {
  if (!name) return "Enter your full name.";
  const phone = phoneError(mobile);
  if (phone) return phone;
  if (email && !EMAIL.test(email)) return "Enter a valid email address, or leave it blank.";
  return "";
}

export type StayRoom = { id?: string; name: string; hidden?: boolean };
export type StayPackage = { name: string; active: boolean };
export interface Stay {
  /** The room's current name, or the event / dining choice. */
  roomType: string;
  roomId?: string;
  /** 0 for events and dining. */
  roomsRequested: number;
  checkin: string;
  checkout: string;
  guests: number;
  event: boolean;
}
/**
 * What is being requested and when, with the website's rules: a visible room (by id, else by name), the banquet hall,
 * an active banquet package or a dining enquiry; 1–10 rooms; valid dates from today; 1–20 guests (1–300 for events).
 * Used by the public form and by staff adding a booking, so both follow the same rules.
 */
export function resolveStay(
  b: Record<string, unknown>,
  rooms: StayRoom[],
  packages: StayPackage[],
): { error: string } | { stay: Stay } {
  const roomType = cleanText(b.roomType, 150),
    roomId = cleanText(b.roomId, 80);
  // Rooms are matched by id (the form sends it), so a rename between loading the form and sending it is harmless.
  const room = rooms.find(r => !r.hidden && (roomId ? r.id === roomId : r.name === roomType));
  const pkg = packages.find(p => p.active && "Banquet - " + p.name === roomType);
  // A matched room is a room stay, whatever else the request names, so it keeps the room guest limit.
  const event = !room && (roomType === "Banquet hall" || !!pkg);
  if (!room && !event && roomType !== "Dining enquiry")
    return { error: "Please choose an available room or enquiry type." };
  const roomsRequested = room ? Number(b.roomsRequested ?? 1) : 0;
  if (room && (!Number.isInteger(roomsRequested) || roomsRequested < 1 || roomsRequested > 10))
    return { error: "Request between 1 and 10 rooms." };
  const error = dateError(b.checkin, b.checkout, !!room);
  if (error) return { error };
  const guests = Number(b.guests),
    maximum = event ? 300 : 20;
  if (!Number.isInteger(guests) || guests < 1 || guests > maximum)
    return { error: "Enter a guest count between 1 and " + maximum + "." };
  return {
    stay: {
      roomType: room ? room.name : roomType,
      ...(room?.id ? { roomId: room.id } : {}),
      roomsRequested,
      checkin: b.checkin as string,
      checkout: typeof b.checkout === "string" ? b.checkout : "",
      guests,
      event,
    },
  };
}
