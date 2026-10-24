"use client";

import Image from "next/image";
import { useApp } from "@/lib/context";

export default function About() {
  const { t } = useApp();
  return (
    <section id="about">
      <div className="wrap intro">
        <div className="intro-media" data-reveal>
          <Image src="/images/image-19.jpeg" alt="Hotel lobby with marble floors" width={600} height={450} />
        </div>
        <div>
          <h2>{t("about.title")}</h2>
          <p>{t("about.p1")}</p>
          <ul className="facts">
            <li>24/7 security</li>
            <li>Power backup</li>
            <li>High-speed Wi-Fi</li>
          </ul>
          <div className="about-side" data-reveal>
            <Image src="/images/image-32.jpeg" alt="Gold-trimmed guest corridor" width={300} height={225} loading="lazy" />
            <figure className="side-photo">
              <span className="chip">Sample photo</span>
              <Image src="/images/image-20.jpeg" alt="Reception desk" width={300} height={225} loading="lazy" style={{ aspectRatio: "4/3" }} />
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
