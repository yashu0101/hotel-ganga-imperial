import Image from "next/image";
import { PHOTOS } from "@/lib/config";

const photo = PHOTOS.lobby;

export default function About() {
  return (
    <section id="about">
      <div className="wrap intro">
        <div className="intro-media">
          <Image src={photo.src} alt={photo.caption} width={600} height={450} />
          {photo.sample && <span className="chip">Representative photo</span>}
        </div>
        <div>
          <span className="eyebrow">THE GANGA IMPERIAL EXPERIENCE</span>
          <h2>Where marble meets warmth</h2>
          <p>
            Warm interiors, marble details and considered spaces set the scene for a restful stay. Explore our rooms,
            unwind by the rooftop pool, or bring everyone together for a celebration.
          </p>
          <ul className="facts">
            <li>24/7 security</li>
            <li>Power backup</li>
            <li>High-speed Wi-Fi</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
