"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SITE_CONFIG } from "@/lib/config";
import { useApp } from "@/lib/context";

interface Room {
  name: string; text: string; image: string; rate: string; sample: boolean; hidden?: boolean;
}

export default function Rooms() {
  const { t } = useApp();
  const [rooms, setRooms] = useState<Room[]>(SITE_CONFIG.rooms);

  useEffect(() => {
    fetch("/api/rooms").then(r => r.json()).then((data: Room[]) => {
      const visible = data.filter(r => !r.hidden);
      if (visible.length > 0) setRooms(visible);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll(".rcard");
    cards.forEach(c => {
      const inn = c.querySelector(".rcard-in") as HTMLElement;
      if (!inn) return;
      const onMove = (e: Event) => {
        const ev = e as PointerEvent;
        const b = c.getBoundingClientRect();
        const x = (ev.clientX - b.left) / b.width - 0.5;
        const y = (ev.clientY - b.top) / b.height - 0.5;
        inn.style.setProperty("--ty", (x * 10) + "deg");
        inn.style.setProperty("--tx", (-y * 10) + "deg");
      };
      const onLeave = () => {
        inn.style.setProperty("--ty", "0deg");
        inn.style.setProperty("--tx", "0deg");
      };
      c.addEventListener("pointermove", onMove);
      c.addEventListener("pointerleave", onLeave);
    });
  }, [rooms]);

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
          {rooms.map((room, i) => (
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
                    <span className="rcard-price">{room.rate || t("rooms.rateOnRequest")}</span>
                    <a href="/book">{t("rooms.enquire")}</a>
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
            Rooms are reserved by enquiry. <a href="/book">Book now</a> or <a href="#enquire">send your dates</a>.
          </div>
        </div>
      </div>
    </section>
  );
}
