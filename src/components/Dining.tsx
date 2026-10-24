"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useApp } from "@/lib/context";

const FAN_ITEMS = [
  { i: -1, a: 1, src: "/images/image-30.jpeg", alt: "Rooftop evenings", caption: "Rooftop evenings", sample: true },
  { i: 1, a: 1, src: "/images/image-26.jpeg", alt: "Club lounge", caption: "Club lounge", sample: false },
  { i: 0, a: 0, src: "/images/image-29.jpeg", alt: "Restaurant", caption: "Restaurant", sample: true },
];

export default function Dining() {
  const { t } = useApp();
  const fanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fan = fanRef.current;
    if (!fan) return;
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    let ticking = false;
    const upd = () => {
      ticking = false;
      const vh = window.innerHeight;
      const fr = fan.getBoundingClientRect();
      const s = reduce ? 1 : clamp((vh - fr.top) / (vh * .7), 0, 1);
      fan.querySelectorAll("figure").forEach(f => (f as HTMLElement).style.setProperty("--s", s.toFixed(3)));
    };
    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } };
    window.addEventListener("scroll", req, { passive: true });
    upd();
    return () => window.removeEventListener("scroll", req);
  }, []);

  return (
    <section className="dining" id="dining">
      <div className="wrap fan-wrap">
        <div>
          <h2>{t("dining.title")}</h2>
          <p style={{ marginTop: 24 }}>Sample section. Candle-lit tables, rooftop evenings above the city lights and a relaxed lounge to end the day.</p>
          <p>Replace these sample images and words with the hotel&apos;s real restaurant details once confirmed.</p>
          <a className="btn btn-solid" href="#enquire">Ask about dining</a>
        </div>
        <div className="fan" id="fan" ref={fanRef}>
          {FAN_ITEMS.map((item, idx) => (
            <figure key={idx} style={{ "--i": item.i, "--a": item.a } as React.CSSProperties}>
              {item.sample && <span className="chip">Sample photo</span>}
              <Image src={item.src} alt={item.alt} width={380} height={475} loading="lazy" />
              <figcaption>{item.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
