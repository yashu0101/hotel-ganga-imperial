import Image from "next/image";
import Link from "next/link";
import { PHOTOS } from "@/lib/config";
import type { Room } from "@/lib/types";

/** Lowest parseable nightly rate among visible rooms, formatted for India, or "" when none is known. */
function lowestRate(rooms: Room[]): string {
  const rates = rooms.map(room => Number(room.rate.replace(/[^\d]/g, ""))).filter(rate => rate > 0);
  return rates.length ? `₹${Math.min(...rates).toLocaleString("en-IN")}` : "";
}

export default function Hero({ rooms }: { rooms: Room[] }) {
  const from = lowestRate(rooms);
  return (
    <section className="hero" id="home" aria-label="Welcome">
      <div className="hero-media">
        <Image
          src={PHOTOS.exterior.src}
          alt="Hotel Ganga Imperial at night, its name lit in brass letters above the entrance"
          fill
          sizes="(max-width:900px) 100vw, 60vw"
          preload
          loading="eager"
        />
      </div>
      <div className="hero-inner">
        <h1>
          A little grandeur,
          <br /> a warmer welcome.
        </h1>
        <p>Premium rooms, a rooftop swimming pool and a banquet hall under one warmly lit roof.</p>
        <div className="btns">
          <Link className="btn btn-solid" href="/book" data-reserve-cta>
            Request a reservation
          </Link>
          <a className="btn btn-ghost" href="#rooms">
            See the rooms
          </a>
        </div>
      </div>
      <ul className="hero-facts" aria-label="At a glance">
        <li>
          <a href="#rooms">
            <strong>{from ? `Rooms from ${from} a night` : "Rooms and suites"}</strong>
            <span>{from ? "Indicative rate, before taxes" : "Rates on request"}</span>
          </a>
        </li>
        <li>
          <a href="#amenities">
            <strong>Rooftop swimming pool</strong>
            <span>Plus a spa, gym and club lounge</span>
          </a>
        </li>
        <li>
          <a href="#events">
            <strong>Banquet hall for up to 300</strong>
            <span>Weddings, receptions and functions</span>
          </a>
        </li>
      </ul>
    </section>
  );
}
