import { SiteConfig } from "./types";

export const SITE_CONFIG: SiteConfig = {
  hotelName: "Hotel Ganga Imperial",
  contact: {
    phone: process.env.NEXT_PUBLIC_HOTEL_PHONE || "",
    whatsapp: process.env.NEXT_PUBLIC_HOTEL_WHATSAPP || "",
    email: process.env.NEXT_PUBLIC_HOTEL_EMAIL || "",
    address: process.env.NEXT_PUBLIC_HOTEL_ADDRESS || "",
    mapEmbedUrl: process.env.NEXT_PUBLIC_HOTEL_MAP_URL || "",
  },
  rooms: [
    {
      name: "Deluxe Room",
      text: "A warm, cove-lit room with an upholstered headboard, work desk and city view. Includes AC, Wi-Fi, TV, mini-bar and complimentary breakfast.",
      image: "/images/image-14.jpeg",
      rate: "\u20B93,000/night",
      sample: true,
    },
    {
      name: "Premium Room",
      text: "Extra space, brass accents and a sitting area for a more relaxed stay. Includes all Deluxe amenities plus a lounge area and premium toiletries.",
      image: "/images/image-15.jpeg",
      rate: "\u20B94,500/night",
      sample: true,
    },
    {
      name: "Suite",
      text: "A separate living room, king bed and premium bath amenities for longer visits. Includes butler service, welcome drink and late checkout.",
      image: "/images/image-16.jpeg",
      rate: "\u20B98,000/night",
      sample: true,
    },
    {
      name: "Family Room",
      text: "Twin beds, extra floor space and everything a family needs under one roof. Includes kids' welcome kit, extra bedding and family breakfast.",
      image: "/images/image-17.jpeg",
      rate: "\u20B95,500/night",
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
  { src: "/images/image-43.jpeg", caption: "Hotel exterior at night" },
  { src: "/images/image-49.jpeg", caption: "Guest room with seating area" },
  { src: "/images/image-52.jpeg", caption: "Guest room interior detail" },
  { src: "/images/image-45.jpeg", caption: "Rooftop swimming pool" },
  { src: "/images/image-48.jpeg", caption: "Banquet hall" },
  { src: "/images/image-51.jpeg", caption: "Dining and lounge area" },
  { src: "/images/image-50.jpeg", caption: "Spa treatment room" },
  { src: "/images/image-53.jpeg", caption: "Fitness room" },
];
export const EXPERIENCE_STEPS = [
  { title: "A welcome that glows", description: "Step inside warm interiors, marble details and spaces made for slowing down.", image: "/images/image-44.jpeg" },
  { title: "Your own quiet retreat", description: "Discover welcoming guest rooms, soft lighting and a little space to make yourself at home.", image: "/images/image-49.jpeg" },
  { title: "Above the everyday", description: "Take a moment by the rooftop swimming pool, with the city stretching out beyond.", image: "/images/image-45.jpeg" },
  { title: "Room for celebration", description: "Bring your people together in a chandelier-lit banquet hall for life's special occasions.", image: "/images/image-48.jpeg" },
];
