"use client";

import Image from "next/image";
import { useApp } from "@/lib/context";

export default function Events() {
  const { t } = useApp();
  return (
    <section id="events">
      <div className="wrap events">
        <div>
          <h2>{t("events.title")}</h2>
          <p style={{ marginTop: 24 }}>{t("events.text")}</p>
          <p>Share your date and guest count and the team will come back with availability.</p>
          <a className="btn btn-solid" href="#enquire">{t("events.cta")}</a>
          <div className="events-pics">
            <Image src="/images/image-26.jpeg" alt="Club lounge" width={200} height={200} loading="lazy" />
            <Image src="/images/image-29.jpeg" alt="Dining area" width={200} height={200} loading="lazy" />
            <Image src="/images/image-30.jpeg" alt="Rooftop terrace" width={200} height={200} loading="lazy" />
          </div>
        </div>
        <div className="media" data-reveal>
          <Image src="/images/image-13.jpeg" alt="Banquet hall with chandeliers" width={600} height={450} loading="lazy" />
        </div>
      </div>
    </section>
  );
}
