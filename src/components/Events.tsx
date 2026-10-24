"use client";

import Image from "next/image";
import { useApp } from "@/lib/context";

export default function Events() {
  const { t } = useApp();
  return (
    <section id="events">
      <div className="wrap events">
        <div className="events-text" data-reveal>
          <h2>{t("events.title")}</h2>
          <p>{t("events.text")}</p>
          <a className="btn btn-solid" href="#enquire">{t("events.cta")}</a>
        </div>
        <div className="events-img" data-reveal>
          <Image src="/images/image-13.jpeg" alt="Banquet hall" width={600} height={400} />
        </div>
      </div>
    </section>
  );
}
