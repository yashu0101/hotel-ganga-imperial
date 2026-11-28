import type { HotelSettings, RoomSpecification } from "./types";

/**
 * Hotel policies and privacy-notice facts as first shipped. Staff change them under Admin → Settings (stored in the
 * database); these values fill in anything not changed there. Leave a value "" until the hotel approves it: empty
 * values are hidden on the site (never shown as "to be updated") and listed in the admin launch checklist instead.
 */
export const DEFAULT_SETTINGS: HotelSettings = {
  checkIn: "",
  checkOut: "",
  cancellation: "Cancellation terms are included in your individual quote.",
  deposits: "Deposit and payment terms are included in your individual quote.",
  children: "Child rates and extra-bed arrangements are confirmed with your quote.",
  identification: "The hotel will let you know which identification to bring before you arrive.",
  accessibility:
    "Please contact the hotel to confirm step-free access and accessible room features before making travel arrangements.",
  responseTime: "",
  // The registered business name (e.g. "Ganga Imperial Hospitality Pvt. Ltd."), not yet confirmed by the hotel.
  legalEntity: "",
  privacyContactName: "the General Manager",
  privacyContactEmail: "",
  retentionMonths: 12,
  providers: ["Vercel (website hosting)", "Neon (database that stores reservation requests)"],
  privacyLastUpdated: "28 November 2026",
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

type SampleItem = { active?: boolean; sample?: boolean };
export type LaunchGroup = "contact" | "policies" | "privacy" | "rooms" | "content";
/** One thing to finish before launch. The admin shows it in the staff's language; see launchItemText for English. */
export interface LaunchItem {
  group: LaunchGroup;
  key:
    | "phone"
    | "whatsapp"
    | "email"
    | "address"
    | "map"
    | "times"
    | "responseTime"
    | "legalEntity"
    | "privacyContact"
    | "retention"
    | "privacyReviewed"
    | "roomFacts"
    | "roomPhoto"
    | "roomRate"
    | "offer"
    | "package"
    | "dining";
  /** The room, offer, package or dining option it is about. */
  name?: string;
  /** Room facts still unknown. */
  facts?: (keyof RoomSpecification)[];
  /** The environment variable that sets a contact detail. */
  env?: string;
}
export interface LaunchInput {
  contact: { phone: string; whatsapp: string; email: string; address: string; mapEmbedUrl: string };
  settings: HotelSettings;
  /** The rooms guests can see. */
  rooms: ({ name: string; sample?: boolean; sampleRate?: boolean } & Partial<RoomSpecification>)[];
  offers?: ({ title: string } & SampleItem)[];
  packages?: ({ name: string } & SampleItem)[];
  dining?: ({ name: string } & SampleItem)[];
}

/** Guest-facing details still missing before launch, and sample content guests can see. */
export function launchChecklist({ contact, settings, rooms, offers = [], packages = [], dining = [] }: LaunchInput) {
  const items: LaunchItem[] = [];
  const envs: [keyof LaunchInput["contact"], LaunchItem["key"], string][] = [
    ["phone", "phone", "NEXT_PUBLIC_HOTEL_PHONE"],
    ["whatsapp", "whatsapp", "NEXT_PUBLIC_HOTEL_WHATSAPP"],
    ["email", "email", "NEXT_PUBLIC_HOTEL_EMAIL"],
    ["address", "address", "NEXT_PUBLIC_HOTEL_ADDRESS"],
    ["mapEmbedUrl", "map", "NEXT_PUBLIC_HOTEL_MAP_URL"],
  ];
  for (const [field, key, env] of envs) if (!contact[field]?.trim()) items.push({ group: "contact", key, env });
  if (!settings.checkIn || !settings.checkOut) items.push({ group: "policies", key: "times" });
  if (!settings.responseTime) items.push({ group: "policies", key: "responseTime" });
  const privacy: [keyof HotelSettings, LaunchItem["key"]][] = [
    ["legalEntity", "legalEntity"],
    ["privacyContactName", "privacyContact"],
    ["retentionMonths", "retention"],
    ["privacyLastUpdated", "privacyReviewed"],
  ];
  for (const [field, key] of privacy) if (!String(settings[field] || "").trim()) items.push({ group: "privacy", key });
  for (const room of rooms) {
    const facts = ROOM_FACT_LABELS.filter(([key]) => !room[key]?.trim()).map(([key]) => key);
    if (facts.length) items.push({ group: "rooms", key: "roomFacts", name: room.name, facts });
    if (room.sample) items.push({ group: "rooms", key: "roomPhoto", name: room.name });
    if (room.sampleRate) items.push({ group: "rooms", key: "roomRate", name: room.name });
  }
  // Only what guests can see: a switched-off sample is harmless until someone switches it on.
  for (const o of offers) if (o.active && o.sample) items.push({ group: "content", key: "offer", name: o.title });
  for (const p of packages) if (p.active && p.sample) items.push({ group: "content", key: "package", name: p.name });
  for (const d of dining) if (d.active && d.sample) items.push({ group: "content", key: "dining", name: d.name });
  return items;
}

const CONTACT_LABELS: Partial<Record<LaunchItem["key"], string>> = {
  phone: "Hotel phone number",
  whatsapp: "WhatsApp number",
  email: "Reservations email",
  address: "Hotel address",
  map: "Map / directions link",
};
/** A checklist item in English, e.g. "Deluxe Room: sample rate, confirm or change it (admin → Room Types)". */
export function launchItemText(item: LaunchItem): string {
  const settings = " (admin → Settings)";
  switch (item.key) {
    case "times":
      return "Check-in and check-out times" + settings;
    case "responseTime":
      return "Typical response time to requests" + settings;
    case "legalEntity":
      return "Privacy notice: legal business name" + settings;
    case "privacyContact":
      return "Privacy notice: grievance officer / privacy contact" + settings;
    case "retention":
      return "Privacy notice: how long requests are kept" + settings;
    case "privacyReviewed":
      return "Privacy notice: last-reviewed date" + settings;
    case "roomFacts": {
      const labels = ROOM_FACT_LABELS.filter(([key]) => item.facts?.includes(key)).map(([, l]) => l.toLowerCase());
      return `${item.name}: ${labels.join(", ")} (admin → Room Types)`;
    }
    case "roomPhoto":
      return `${item.name}: real photography (currently a representative image)`;
    case "roomRate":
      return `${item.name}: sample rate, confirm or change it (admin → Room Types)`;
    case "offer":
      return `Offer “${item.name}”: sample offer, approve or remove it (admin → Offers)`;
    case "package":
      return `${item.name}: sample price and details (admin → Banquet Packages)`;
    case "dining":
      return `${item.name}: sample price and details (admin → Dining)`;
    default:
      return `${CONTACT_LABELS[item.key]} (${item.env})`;
  }
}
/** The launch checklist in English. */
export function missingLaunchDetails(input: LaunchInput): string[] {
  return launchChecklist(input).map(launchItemText);
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
