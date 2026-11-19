import { SiteConfig } from "./types";

export const SITE_CONFIG: SiteConfig = {
  hotelName: "Hotel Ganga Imperial",
  contact: {
    phone: "+91 6388360881",
    whatsapp: "916388360881",
    email: "info@hotelgangaimperial.com",
    address: "Hotel Ganga Imperial, Tilamapur, Varanasi, Rustampur, Uttar Pradesh 221112",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3606.5!2d83.0!3d25.3!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sHotel+Ganga+Imperial!5e0!3m2!1sen!2sin!4v1",
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
