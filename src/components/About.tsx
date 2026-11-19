"use client";

import Image from "next/image";
import { useApp } from "@/lib/context";

export default function About() {
  const { t } = useApp();
  return (
    <section id="about">
      <div className="wrap intro">
        <div className="intro-media" data-reveal>
          <Image src="/images/image-44.jpeg" alt="Lounge with warm lighting and marble details" width={600} height={450} />
        </div>
        <div>
          <span className="eyebrow">THE GANGA IMPERIAL EXPERIENCE</span><h2>{t("about.title")}</h2>
          <p>{t("about.p1")}</p>
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
