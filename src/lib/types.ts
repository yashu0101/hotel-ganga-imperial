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
  sample: boolean;
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
}

export interface BanquetPackage {
  id: string;
  name: string;
  description: string;
  capacity: string;
  price: string;
  includes: string[];
  active: boolean;
  createdAt: string;
}

export interface DiningOption {
  id: string;
  name: string;
  description: string;
  price: string;
  category: "breakfast" | "lunch" | "dinner" | "room-service" | "event-catering";
  active: boolean;
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

export interface DB {
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
