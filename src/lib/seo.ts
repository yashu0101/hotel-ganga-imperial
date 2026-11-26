// schema.org Hotel structured data for the homepage. Only facts the site actually knows are
// included: unset contact details and unapproved times are omitted, never guessed.
import { nightlyRate } from "@/lib/reservation";
import { HOTEL_INFORMATION } from "@/lib/hotel-content";

const AMENITIES = [
  "Rooftop swimming pool",
  "Banquet hall",
  "Spa",
  "Gym",
  "Club lounge",
  "Table tennis",
  "24/7 security",
  "Power backup",
  "High-speed Wi-Fi",
];
const rupees = (n: number) => "₹" + n.toLocaleString("en-IN");

export function hotelJsonLd({
  rooms,
  contact,
  siteUrl,
}: {
  rooms: { name: string; rate: string; hidden?: boolean }[];
  contact: { phone: string; email: string; address: string; mapEmbedUrl: string };
  siteUrl: string;
}) {
  const rates = rooms
    .filter(r => !r.hidden)
    .map(r => nightlyRate(r.rate))
    .filter((n): n is number => n !== null);
  const site = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: "Hotel Ganga Imperial",
    description: "Premium rooms, a rooftop swimming pool and a banquet hall under one warmly lit roof.",
    ...(site ? { url: site, image: site + "/images/image-43.jpeg" } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.address ? { address: contact.address } : {}),
    ...(contact.mapEmbedUrl ? { hasMap: contact.mapEmbedUrl } : {}),
    ...(HOTEL_INFORMATION.checkIn ? { checkinTime: HOTEL_INFORMATION.checkIn } : {}),
    ...(HOTEL_INFORMATION.checkOut ? { checkoutTime: HOTEL_INFORMATION.checkOut } : {}),
    ...(rates.length ? { priceRange: `${rupees(Math.min(...rates))}–${rupees(Math.max(...rates))} per night` } : {}),
    amenityFeature: AMENITIES.map(name => ({ "@type": "LocationFeatureSpecification", name, value: true })),
  };
}

/**
 * Canonical URL metadata for a page path. Omitted when NEXT_PUBLIC_SITE_URL (metadataBase) is unset,
 * so builds never emit localhost canonicals.
 */
export function canonical(path: string) {
  return process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: path } } : {};
}

/** Serialise for a <script type="application/ld+json"> tag without allowing it to close the tag. */
export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
