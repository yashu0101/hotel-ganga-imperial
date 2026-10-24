export interface Room {
  name: string;
  text: string;
  image: string;
  rate: string;
  sample: boolean;
  hidden?: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
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

export interface Booking {
  id: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  country: string;
  gender: "male" | "female" | "other";
  roomType: string;
  checkin: string;
  checkout: string;
  guests: number;
  amount: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  bookingStatus: "pending" | "confirmed" | "checked-in" | "checked-out" | "cancelled";
  paymentId: string;
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
  enquiries: Enquiry[];
  bookings: Booking[];
  offers: Offer[];
  config: SiteConfig;
}
