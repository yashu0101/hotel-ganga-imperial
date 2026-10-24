import { SiteConfig } from "./types";

export const SITE_CONFIG: SiteConfig = {
  hotelName: "Hotel Ganga Imperial",
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    mapEmbedUrl: "",
  },
  rooms: [
    {
      name: "Deluxe Room",
      text: "A warm, cove-lit room with an upholstered headboard, work desk and city view.",
      image: "/images/image-14.jpeg",
      rate: "",
      sample: true,
    },
    {
      name: "Premium Room",
      text: "Extra space, brass accents and a sitting area for a more relaxed stay.",
      image: "/images/image-15.jpeg",
      rate: "",
      sample: true,
    },
    {
      name: "Suite",
      text: "A separate living room, king bed and premium bath amenities for longer visits.",
      image: "/images/image-16.jpeg",
      rate: "",
      sample: true,
    },
    {
      name: "Family Room",
      text: "Twin beds, extra floor space and everything a family needs under one roof.",
      image: "/images/image-17.jpeg",
      rate: "",
      sample: true,
    },
  ],
  venue: {
    enabled: false,
    name: "",
    tagline: "",
    description: "",
    logo: "",
    image: "",
  },
};

export const NAV_ITEMS = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#rooms", label: "Rooms" },
  { href: "#amenities", label: "Amenities" },
  { href: "#events", label: "Banquet" },
  { href: "#dining", label: "Dining" },
  { href: "#gallery", label: "Gallery" },
];

export const GALLERY_IMAGES = [
  { src: "/images/image-18.jpeg", caption: "Hotel entrance at night" },
  { src: "/images/image-19.jpeg", caption: "Lobby" },
  { src: "/images/image-20.jpeg", caption: "Reception area" },
  { src: "/images/image-21.jpeg", caption: "Premium room interior" },
  { src: "/images/image-22.jpeg", caption: "Room with city view" },
  { src: "/images/image-23.jpeg", caption: "Rooftop swimming pool" },
  { src: "/images/image-24.jpeg", caption: "Spa treatment room" },
  { src: "/images/image-25.jpeg", caption: "Fitness gym" },
  { src: "/images/image-26.jpeg", caption: "Club lounge" },
  { src: "/images/image-27.jpeg", caption: "Banquet hall setup" },
  { src: "/images/image-28.jpeg", caption: "Wedding reception" },
  { src: "/images/image-29.jpeg", caption: "Dining area" },
  { src: "/images/image-30.jpeg", caption: "Evening ambiance" },
  { src: "/images/image-31.jpeg", caption: "Building exterior" },
  { src: "/images/image-32.jpeg", caption: "Corridor" },
  { src: "/images/image-33.jpeg", caption: "Suite bathroom" },
];

export const EXPERIENCE_STEPS = [
  {
    title: "Arrive in the glow",
    description: "A lit-up entrance and a marble lobby welcome you in, day or night.",
    image: "/images/image-3.jpeg",
  },
  {
    title: "Rest in premium rooms",
    description: "Cove-lit ceilings, upholstered headboards and calm, warm interiors.",
    image: "/images/image-6.jpeg",
  },
  {
    title: "Unwind on the rooftop",
    description: "A swimming pool above the city, with a spa and gym for the rest of the day.",
    image: "/images/image-8.jpeg",
  },
  {
    title: "Celebrate together",
    description: "A chandeliered banquet hall for weddings, receptions and family functions.",
    image: "/images/image-9.jpeg",
  },
];
