export interface Room {
  name: string;
  text: string;
  image: string;
  rate: string;
  sample: boolean;
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
  config: SiteConfig;
}
