import GuestClarity from "@/components/GuestClarity";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Rooms from "@/components/Rooms";
import Offers from "@/components/Offers";
import Amenities from "@/components/Amenities";
import Events from "@/components/Events";
import Dining from "@/components/Dining";
import Gallery from "@/components/Gallery";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import DoorIntro from "@/components/DoorIntro";
import Experience from "@/components/Experience";
import MotionEffects from "@/components/MotionEffects";
import { getOffers, getRooms } from "@/lib/db";
import { SITE_CONFIG } from "@/lib/config";
import { hotelJsonLd, jsonLdScript } from "@/lib/seo";

// Static, refreshed every 5 minutes and immediately after admin edits (revalidatePath).
export const revalidate = 300;

export default async function Home() {
  const [rooms, offers] = await Promise.all([getRooms(), getOffers()]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            hotelJsonLd({ rooms, contact: SITE_CONFIG.contact, siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "" }),
          ),
        }}
      />
      <DoorIntro />
      <MotionEffects />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        {/* What guests decide on (rooms, rates, amenities) comes first; the scroll-driven tour follows. */}
        <Hero />
        <About />
        <Rooms rooms={rooms.filter(r => !r.hidden)} preview />
        <Offers offers={offers} />
        <Amenities />
        <Experience />
        <Events preview />
        <Dining preview />
        <Gallery />
        <GuestClarity />
      </main>
      <Footer />
      <a className="mobile-reserve" href="/book">
        Request a reservation <span>↗</span>
      </a>
      <BackToTop />
    </>
  );
}
