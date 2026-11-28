// Dates, durations and labels shared by the admin views. Calendar days are the hotel's
// (Asia/Kolkata), matching how reservation dates are validated.
export const HOTEL_TIME_ZONE = "Asia/Kolkata";
const DAY = 86_400_000;

/** Short reference staff can read out to a guest: the first 8 characters of the id. */
export const reference = (id: string) => id.slice(0, 8).toUpperCase();
export const localeFor = (lang: string) => (lang === "hi" ? "hi-IN" : "en-IN");

/** A day at the hotel as YYYY-MM-DD; offset in whole days from today. */
export function hotelDay(offsetDays = 0, from = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(from + offsetDays * DAY));
}

/** Whole days from one YYYY-MM-DD to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  if (!from || !to) return 0;
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / DAY);
}

/** Adds days to a YYYY-MM-DD date. */
export function addDays(day: string, n: number) {
  return new Date(Date.parse(day + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
}

/** A calendar date (YYYY-MM-DD) for display; never shifted by the viewer's time zone. */
export function formatDay(
  day: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
) {
  if (!day) return "";
  return new Date(day.slice(0, 10) + "T00:00:00Z").toLocaleDateString(locale, { ...options, timeZone: "UTC" });
}

/** A moment (ISO timestamp) in hotel time, e.g. "28 Nov, 2:05 pm". */
export function formatMoment(iso: string, locale: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale, {
    timeZone: HOTEL_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** How long ago something happened, as a short localised duration: "45 min", "3 hr", "2 days". */
export function elapsed(iso: string, locale: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  const [value, unit] =
    minutes < 60
      ? [minutes, "minute"]
      : minutes < 48 * 60
        ? [Math.floor(minutes / 60), "hour"]
        : [Math.floor(minutes / 1440), "day"];
  return {
    minutes,
    text: new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" }).format(value),
  };
}

/** "3 hr ago", "yesterday": when something happened, relative to now. */
export function ago(iso: string, locale: string, now = Date.now()) {
  const minutes = Math.round((Date.parse(iso) - now) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  if (Math.abs(minutes) < 48 * 60) return rtf.format(Math.round(minutes / 60), "hour");
  return rtf.format(Math.round(minutes / 1440), "day");
}

/** Requests still waiting for staff after this long are flagged. */
export const LATE_AFTER_MINUTES = 24 * 60;

/** Replaces {name} placeholders in a translated string. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

/** A translated count: uses the "<key>One" string for exactly one, "<key>" otherwise. */
export function counted(t: (key: string) => string, key: string, n: number) {
  return fill(t(n === 1 ? key + "One" : key), { n });
}

/** Request types for events and dining, stored in English as the website sends them. */
export const HALL = "Banquet hall",
  DINING = "Dining enquiry",
  PACKAGE_PREFIX = "Banquet - ";

/**
 * A request's type in the admin's language. The fixed event and dining types are translated; room and
 * package names are shown as staff entered them.
 */
export function requestType(t: (key: string) => string, what: string) {
  if (what === HALL) return t("admin.opt.hall");
  if (what === DINING) return t("admin.opt.dining");
  if (what.startsWith(PACKAGE_PREFIX)) return fill(t("admin.opt.package"), { name: what.slice(PACKAGE_PREFIX.length) });
  return what;
}

/**
 * Whether a request is a room stay rather than an event or dining request. Decided from the request itself, so a
 * stay whose room type was deleted or renamed still counts as rooms (and ends the night before check-out).
 */
export function isRoomStay(b: { roomType: string; roomsRequested?: number }) {
  if (b.roomsRequested === 0) return false;
  return b.roomType !== HALL && b.roomType !== DINING && !b.roomType.startsWith(PACKAGE_PREFIX);
}
/** A checked-in guest due to leave by `today`: on the check-out or end date, or the only day of a one-day request. */
export function dueToLeave(b: { bookingStatus: string; checkin: string; checkout: string }, today: string) {
  return b.bookingStatus === "checked-in" && !!b.checkin && (b.checkout || b.checkin) <= today;
}
/** Rooms asked for across requests; events and dining ask for none. */
export function roomsRequested(requests: { roomType: string; roomsRequested?: number }[]) {
  return requests.reduce((n, b) => n + (isRoomStay(b) ? b.roomsRequested || 1 : 0), 0);
}
/** The booking form's value for a room. The calendar uses it too, so a filtered day opens the form on that room. */
export const roomValue = (r: { id?: string; name: string }) => "room:" + (r.id || r.name);

/** A whole number within [min, max] for the booking steppers; anything unreadable becomes min. */
export function clampCount(value: string | number, min: number, max: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

/** An entry's details (stored as JSON by recordChange) in the admin's language. */
export function describeChange(t: (key: string) => string, summary: string) {
  if (!summary) return "–";
  let details: { label?: string; reference?: string; fields?: string[]; status?: string; count?: number };
  try {
    details = JSON.parse(summary);
  } catch {
    return summary;
  }
  const known = (key: string) => (t(key) === key ? "" : t(key));
  const field = (key: string) => known("admin.f." + key) || known("admin.setting." + key) || key;
  return (
    [
      details.label,
      details.reference,
      details.status && (known("admin.status." + details.status) || details.status),
      details.fields?.map(field).join(", "),
      details.count !== undefined && fill(t("admin.exportedCount"), { n: details.count }),
    ]
      .filter(Boolean)
      .join(" · ") || "–"
  );
}
