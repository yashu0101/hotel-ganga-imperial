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

export interface RoomSpecification {
  size: string;
  bed: string;
  occupancy: string;
  bathroom: string;
}
export const ROOM_SPECIFICATIONS: Record<string, RoomSpecification> = {
  "Deluxe Room": { size: "", bed: "", occupancy: "", bathroom: "" },
  "Premium Room": { size: "", bed: "", occupancy: "", bathroom: "" },
  Suite: { size: "", bed: "", occupancy: "", bathroom: "" },
  "Family Room": { size: "", bed: "", occupancy: "", bathroom: "" },
};
const ROOM_FACT_LABELS: [keyof RoomSpecification, string][] = [
  ["size", "Room size"],
  ["bed", "Bed configuration"],
  ["occupancy", "Maximum occupancy"],
  ["bathroom", "Bathroom"],
];
/** Approved facts for a room as [label, value] pairs. Unknown facts are left out. */
export function roomFacts(spec: RoomSpecification | undefined): [string, string][] {
  return ROOM_FACT_LABELS.filter(([key]) => spec?.[key]?.trim()).map(([key, label]) => [label, spec![key].trim()]);
}

/** Guest-facing details still missing before launch. Shown to staff in the admin dashboard. */
export function missingLaunchDetails({
  contact,
  rooms,
}: {
  contact: { phone: string; whatsapp: string; email: string; address: string; mapEmbedUrl: string };
  rooms: { name: string; sample?: boolean }[];
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
  for (const [name, spec] of Object.entries(ROOM_SPECIFICATIONS)) {
    const unknown = ROOM_FACT_LABELS.filter(([key]) => !spec[key].trim()).map(([, label]) => label.toLowerCase());
    if (unknown.length) missing.push(`${name}: ${unknown.join(", ")} (src/lib/hotel-content.ts)`);
  }
  for (const room of rooms)
    if (room.sample) missing.push(`${room.name}: real photography (currently a representative image)`);
  return missing;
}

export const roomSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function roomPhoto(room: { name: string; image: string; sample: boolean }) {
  if (!room.sample) return room.image;
  return room.name === "Family Room"
    ? "/images/image-40.jpeg"
    : room.name === "Suite"
      ? "/images/image-17.jpeg"
      : "/images/image-49.jpeg";
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
