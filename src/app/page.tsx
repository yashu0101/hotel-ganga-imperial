import DoorIntro from "@/components/DoorIntro";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Experience from "@/components/Experience";
import About from "@/components/About";
import Rooms from "@/components/Rooms";
import Amenities from "@/components/Amenities";
import Events from "@/components/Events";
import Dining from "@/components/Dining";
import RingCarousel from "@/components/RingCarousel";
import Gallery from "@/components/Gallery";
import EnquiryForm from "@/components/EnquiryForm";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";

export default function Home() {
  return (
    <>
      <DoorIntro />
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Hero />
        <Experience />
        <About />
        <Rooms />
        <Amenities />
        <Events />
        <Dining />
        <RingCarousel />
        <Gallery />
        <EnquiryForm />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
