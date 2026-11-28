/** Approved facts about a room type. "" means not approved yet: hidden from guests, listed in the launch checklist. */
export interface RoomSpecification {
  size: string;
  bed: string;
  occupancy: string;
  bathroom: string;
  /** Where rooms of this type are, e.g. "Floors 2–4, city-facing wing". */
  location: string;
  view: string;
}

export interface Room extends RoomSpecification {
  /** Stable identifier used by the admin API. Absent only on the built-in defaults in config.ts. */
  id?: string;
  /** The room's web address, /rooms/<slug>. Kept when the room is renamed; staff can change it on purpose. */
  slug: string;
  /** Addresses the room had before its slug was changed. They redirect to the current one. */
  previousSlugs?: string[];
  name: string;
  text: string;
  image: string;
  rate: string;
  /** The photo is representative, not of this room. */
  sample: boolean;
  /** The rate is sample content the hotel has not approved yet (listed in the launch checklist). */
  sampleRate?: boolean;
  hidden?: boolean;
  /** What comes with the room, shown on its detail page. Only list what the description promises. */
  inRoom: string[];
  services: string[];
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  code?: string;
  validFrom: string;
  validTo: string;
  active: boolean;
  /** Days between the request and arrival the offer needs; 0 = none. Checked when a code is entered. */
  minAdvanceDays?: number;
  /** Nights the stay must cover; 0 = none. */
  minNights?: number;
  /** Sample content the hotel has not approved yet (listed in the launch checklist). */
  sample?: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: string;
  guests: number;
  checkin: string;
  checkout: string;
  message: string;
  createdAt: string;
  status: "new" | "contacted" | "confirmed" | "cancelled";
  /** Set while it is in Deleted (restorable for 30 days). */
  deletedAt?: string;
}

export interface NotificationJob {
  id: string;
  bookingId: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  createdAt: string;
  /** When delivery was last tried; retries wait longer after each failure. */
  lastAttemptAt?: string;
}

export interface Booking {
  roomsRequested?: number;
  specialRequests?: string;
  /** The offer code the guest entered (checked against an active offer when sent); "" or absent when none. */
  couponCode?: string;
  /** That offer's title when the request was sent, so staff see it even if the offer is renamed or removed. */
  couponOffer?: string;
  id: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  country: string;
  gender: "male" | "female" | "other";
  /** The room's name when the request was sent (or the event/dining choice). */
  roomType: string;
  /** The requested room's stable id, so the request still matches the room after a rename. Absent on older requests. */
  roomId?: string;
  /** "staff" when staff added it from the dashboard (no guest notification); absent for website requests. */
  source?: "staff";
  checkin: string;
  checkout: string;
  guests: number;
  amount: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  bookingStatus: "pending" | "confirmed" | "checked-in" | "checked-out" | "cancelled";
  paymentId: string;
  createdAt: string;
  /** Set while it is in Deleted (restorable for 30 days, then erased). */
  deletedAt?: string;
}

/** One staff change, for the activity log. Never holds guest details: requests are named by their reference. */
export interface AuditEntry {
  id: string;
  at: string;
  /** The signed-in staff account. */
  actor: string;
  /** e.g. "create", "update", "delete", "restore", "erase", "status", "export". */
  action: string;
  /** The collection or area: "offers", "bookings", "settings" … */
  target: string;
  targetId: string;
  summary: string;
}

export interface BanquetPackage {
  id: string;
  name: string;
  description: string;
  capacity: string;
  price: string;
  includes: string[];
  active: boolean;
  /** Sample content the hotel has not approved yet (listed in the launch checklist). */
  sample?: boolean;
  createdAt: string;
}

export interface DiningOption {
  id: string;
  name: string;
  description: string;
  price: string;
  category: "breakfast" | "lunch" | "dinner" | "room-service" | "event-catering";
  active: boolean;
  /** Sample content the hotel has not approved yet (listed in the launch checklist). */
  sample?: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  city: string;
  active: boolean;
  createdAt: string;
}

export interface SiteConfig {
  hotelName: string;
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    mapEmbedUrl: string;
  };
  rooms: Room[];
  venue: {
    enabled: boolean;
    name: string;
    tagline: string;
    description: string;
    logo: string;
    image: string;
  };
}

/**
 * Hotel policies and privacy-notice facts, edited by staff under Admin → Settings. "" means not approved yet: hidden
 * from guests and listed in the launch checklist.
 */
export interface HotelSettings {
  checkIn: string;
  checkOut: string;
  cancellation: string;
  deposits: string;
  children: string;
  identification: string;
  accessibility: string;
  /** Typical time to reply to a request, e.g. "within 4 hours". */
  responseTime: string;
  /** Registered name of the business responsible for guest data. */
  legalEntity: string;
  /** Person or role guests contact about their data (grievance officer under India's DPDP Act). */
  privacyContactName: string;
  /** Email for privacy requests; the reservations email is used when empty. */
  privacyContactEmail: string;
  /** Months to keep requests; 0 = not decided (nothing is deleted automatically). */
  retentionMonths: number;
  /** Services that receive guest details. */
  providers: string[];
  /** When the privacy notice was last reviewed, e.g. "28 November 2026". */
  privacyLastUpdated: string;
}

export interface DB {
  /** Newest last; capped. */
  auditLog?: AuditEntry[];
  /** Ids of deleted rooms, never given to a new room (older requests still point at them). */
  retiredRoomIds?: string[];
  /** Only the settings staff have changed; the rest come from DEFAULT_SETTINGS. */
  settings?: Partial<HotelSettings>;
  notificationJobs?: NotificationJob[];
  /** Local-development stand-in for the Postgres admin_state table. */
  adminState?: { sessionVersion?: number };
  enquiries: Enquiry[];
  bookings: Booking[];
  offers: Offer[];
  banquetPackages: BanquetPackage[];
  diningOptions: DiningOption[];
  reviews: Review[];
  config: SiteConfig;
}
