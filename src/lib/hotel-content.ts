import type { RoomSpecification } from "./types";

// Property facts shown to guests. Leave a value as "" until the hotel approves it:
// empty values are hidden on the site (never shown as "to be updated") and listed in the
// admin dashboard's launch checklist instead.
export const HOTEL_INFORMATION = {
  checkIn: "",
  checkOut: "",
  cancellation: "Cancellation terms are included in your individual quote.",
  deposits: "Deposit and payment terms are included in your individual quote.",
  children: "Child rates and extra-bed arrangements are confirmed with your quote.",
  identification: "The hotel will let you know which identification to bring before you arrive.",
  accessibility:
    "Please contact the hotel to confirm step-free access and accessible room features before making travel arrangements.",
  responseTime: "",
};

// Privacy notice facts (shown on /privacy). Same rule: leave "" until the hotel approves a value.
export const PRIVACY_INFORMATION = {
  /** Legal name of the business responsible for guest data, e.g. "Ganga Imperial Hospitality Pvt. Ltd.". */
  legalEntity: "Hotel Ganga Imperial",
  /** Person or role guests can contact about their data (the grievance officer under India's DPDP Act). */
  contactName: "the General Manager",
  /** Email for privacy questions and requests; the reservations email is used when this is empty. */
  contactEmail: "",
  /**
   * Months to keep reservation requests and enquiries, counted from when they were sent or from the requested
   * dates, whichever is later. Once set (e.g. 24), the daily job deletes older requests automatically.
   * 0 = not decided yet: nothing is deleted automatically and the notice makes no fixed-period promise.
   */
  retentionMonths: 12,
  /** Services that receive guest details. Add the notification provider once one is chosen. */
  providers: [
    "Vercel (website hosting)",
    "Neon (database that stores reservation requests)",
    // e.g. "Resend (email notifications)" or "Make.com (staff alerts)"
  ],
  /** Date the notice was last reviewed, e.g. "1 December 2026". */
  lastUpdated: "28 November 2026",
};

// Room facts and inclusions are stored with each room and edited in the admin (Room Types).
const ROOM_FACT_LABELS: [keyof RoomSpecification, string][] = [
  ["size", "Room size"],
  ["bed", "Bed configuration"],
  ["occupancy", "Maximum occupancy"],
  ["bathroom", "Bathroom"],
  ["location", "Location in the hotel"],
  ["view", "View"],
];

/**
 * The room a /rooms/<slug> or /book?room=… link means: by its current address, then by an address it had before
 * (the caller redirects), then by name (booking links made before rooms had their own address).
 */
export function findRoom<T extends { slug: string; name: string; previousSlugs?: string[] }>(
  rooms: T[],
  wanted: string,
): T | undefined {
  if (!wanted) return undefined;
  return (
    rooms.find(r => r.slug === wanted) ??
    rooms.find(r => r.previousSlugs?.includes(wanted)) ??
    rooms.find(r => r.name === wanted)
  );
}

/** Approved facts for a room as [label, value] pairs. Unknown facts are left out. */
export function roomFacts(spec: Partial<RoomSpecification> | undefined): [string, string][] {
  return ROOM_FACT_LABELS.filter(([key]) => spec?.[key]?.trim()).map(([key, label]) => [label, spec![key]!.trim()]);
}

/** Guest-facing details still missing before launch. Shown to staff in the admin dashboard. */
export function missingLaunchDetails({
  contact,
  rooms,
}: {
  contact: { phone: string; whatsapp: string; email: string; address: string; mapEmbedUrl: string };
  /** The rooms guests can see. */
  rooms: ({ name: string; sample?: boolean } & Partial<RoomSpecification>)[];
}): string[] {
  const missing: string[] = [];
  const envs: [keyof typeof contact, string, string][] = [
    ["phone", "Hotel phone number", "NEXT_PUBLIC_HOTEL_PHONE"],
    ["whatsapp", "WhatsApp number", "NEXT_PUBLIC_HOTEL_WHATSAPP"],
    ["email", "Reservations email", "NEXT_PUBLIC_HOTEL_EMAIL"],
    ["address", "Hotel address", "NEXT_PUBLIC_HOTEL_ADDRESS"],
    ["mapEmbedUrl", "Map / directions link", "NEXT_PUBLIC_HOTEL_MAP_URL"],
  ];
  for (const [key, label, env] of envs) if (!contact[key]?.trim()) missing.push(`${label} (${env})`);
  if (!HOTEL_INFORMATION.checkIn || !HOTEL_INFORMATION.checkOut)
    missing.push("Check-in and check-out times (src/lib/hotel-content.ts)");
  if (!HOTEL_INFORMATION.responseTime) missing.push("Typical response time to requests (src/lib/hotel-content.ts)");
  const privacy: [keyof typeof PRIVACY_INFORMATION, string][] = [
    ["legalEntity", "Privacy notice: legal business name"],
    ["contactName", "Privacy notice: grievance officer / privacy contact"],
    ["retentionMonths", "Privacy notice: how long requests are kept (retentionMonths)"],
    ["lastUpdated", "Privacy notice: last-reviewed date"],
  ];
  for (const [key, label] of privacy)
    if (!String(PRIVACY_INFORMATION[key] || "").trim()) missing.push(`${label} (src/lib/hotel-content.ts)`);
  for (const room of rooms) {
    const unknown = ROOM_FACT_LABELS.filter(([key]) => !room[key]?.trim()).map(([, label]) => label.toLowerCase());
    if (unknown.length) missing.push(`${room.name}: ${unknown.join(", ")} (admin → Room Types)`);
    if (room.sample) missing.push(`${room.name}: real photography (currently a representative image)`);
  }
  return missing;
}
export const GUEST_FAQS = [
  {
    question: "Is my reservation confirmed when I submit the form?",
    answer:
      "No. Your submission is a request. The hotel must confirm availability, the final price and applicable terms before your stay or event is reserved.",
  },
  {
    question: "Will I be charged on this website?",
    answer:
      "No payment is collected on this website. Any deposit and payment arrangements will be explained in your quote.",
  },
  {
    question: "Are the displayed rates final?",
    answer:
      "Rates are indicative. Dates, room allocation, taxes, inclusions and any offers are subject to hotel confirmation.",
  },
  {
    question: "Can I request several rooms?",
    answer:
      "Yes. Select the number of rooms and your total party size on the reservation form. The hotel will confirm suitable room allocation and occupancy.",
  },
  {
    question: "Can I plan an event or ask about dining?",
    answer:
      "Choose A celebration or Dining on the reservation form, share your date and guest count, and send a request for the hotel to review.",
  },
  {
    question: "How can I ask about accessibility or special arrangements?",
    answer:
      "Add them to the special requests box on the reservation form, or call or message the hotel. Confirm any essential accessibility arrangements with the hotel before booking.",
  },
];
