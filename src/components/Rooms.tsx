"use client";

import { useEffect } from "react";
import Image from "next/image";
import { SITE_CONFIG } from "@/lib/config";
import { useApp } from "@/lib/context";

export default function Rooms() {
  const { t } = useApp();

  useEffect(() => {
    const cards = document.querySelectorAll(".rcard");
    cards.forEach(c => {
      const inn = c.querySelector(".rcard-in") as HTMLElement;
      if (!inn) return;
      c.addEventListener("pointermove", (e) => {
        const ev = e as PointerEvent;
        const b = c.getBoundingClientRect();
        const x = (ev.clientX - b.left) / b.width - 0.5;
        const y = (ev.clientY - b.top) / b.height - 0.5;
        inn.style.setProperty("--ty", (x * 10) + "deg");
        inn.style.setProperty("--tx", (-y * 10) + "deg");
      });
      c.addEventListener("pointerleave", () => {
        inn.style.setProperty("--ty", "0deg");
        inn.style.setProperty("--tx", "0deg");
      });
    });
  }, []);

  return (
    <section className="rooms" id="rooms">
      <div className="wrap">
        <div className="head">
          <h2>{t("rooms.title")}</h2>
          <p>{t("rooms.subtitle")}</p>
        </div>
        <div className="room-grid">
          <figure className="a" data-reveal>
            <Image src="/images/image-10.jpeg" alt="Premium room with king bed" width={600} height={750} />
            <figcaption>Bed with seating corner</figcaption>
          </figure>
          <figure className="b" data-reveal>
            <Image src="/images/image-11.jpeg" alt="Cove-lit ceiling room" width={600} height={480} />
            <figcaption>Cove-lit ceiling and window</figcaption>
          </figure>
          <figure className="c" data-reveal>
            <Image src="/images/image-12.jpeg" alt="Marble TV wall" width={600} height={480} />
            <figcaption>Marble TV wall and wardrobe</figcaption>
          </figure>
        </div>

        <div className="head types-head">
          <h2>{t("rooms.types")}</h2>
          <p>{t("rooms.typesSubtitle")}</p>
        </div>
        <div className="types" id="room-types">
          {SITE_CONFIG.rooms.map((room, i) => (
            <article key={i} className="rcard" data-reveal>
              <div className="rcard-in">
                <figure>
                  <Image src={room.image} alt={room.name} width={400} height={300} />
                  {room.sample && <span className="chip">Sample photo</span>}
                </figure>
                <div className="rcard-body">
                  <h3>{room.name}</h3>
                  <p>{room.text}</p>
                  <div className="rcard-foot">
                    <span>{room.rate || t("rooms.rateOnRequest")}</span>
                    <a href="#enquire">{t("rooms.enquire")}</a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="room-note">
          <div>
            <Image src="/images/image-34.jpeg" alt="" width={84} height={84} loading="lazy" />
            <strong>Climate and comfort</strong>
            Air-conditioned rooms with ceiling fans and soft layered lighting.
          </div>
          <div>
            <Image src="/images/image-35.jpeg" alt="" width={84} height={84} loading="lazy" />
            <strong>Stay connected</strong>
            High-speed Wi-Fi with power backup throughout the hotel.
          </div>
          <div>
            <Image src="/images/image-36.jpeg" alt="" width={84} height={84} loading="lazy" />
            <strong>Booking</strong>
            Rooms are reserved by enquiry. <a href="#enquire">Send your dates</a> and the team will confirm.
          </div>
        </div>
      </div>
    </section>
  );
}
