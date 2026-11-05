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

export default function Home() {
  return (
    <>
      <DoorIntro />
      <MotionEffects />
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Hero />
        <Experience />
        <About />
        <Rooms preview />
        <Offers />
        <Amenities />
        <Events preview />
        <Dining preview />
        <Gallery />
        <GuestClarity />
      </main>
      <Footer />
      <a className="mobile-reserve" href="/book">Request a reservation <span>↗</span></a>
      <BackToTop />
    </>
  );
}
