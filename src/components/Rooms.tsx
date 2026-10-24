"use client";

import Image from "next/image";
import { SITE_CONFIG } from "@/lib/config";
import { useApp } from "@/lib/context";

export default function Rooms() {
  const { t } = useApp();
  return (
    <section className="rooms" id="rooms">
      <div className="wrap">
        <div className="head">
          <h2>{t("rooms.title")}</h2>
          <p>{t("rooms.subtitle")}</p>
        </div>
        <div className="room-grid">
          <div className="room-photo" data-reveal><Image src="/images/image-10.jpeg" alt="Room interior" width={600} height={400} /></div>
          <div className="room-photo" data-reveal><Image src="/images/image-11.jpeg" alt="Room detail" width={600} height={400} /></div>
          <div className="room-photo wide" data-reveal><Image src="/images/image-12.jpeg" alt="Room view" width={800} height={400} /></div>
        </div>
        <div className="head types-head">
          <h2>{t("rooms.types")}</h2>
          <p>{t("rooms.typesSubtitle")}</p>
        </div>
        <div className="types">
          {SITE_CONFIG.rooms.map((room, i) => (
            <article key={i} className="rcard" data-reveal>
              <div className="rcard-in">
                <figure>
                  <Image src={room.image} alt={room.name} width={400} height={300} />
                  {room.sample && <span className="chip">{t("rooms.samplePhoto")}</span>}
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
        <div className="room-note"><p>{t("rooms.note")}</p></div>
      </div>
    </section>
  );
}
