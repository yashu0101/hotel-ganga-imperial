"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useApp } from "@/lib/context";

const FAN_ITEMS = [
  { i: -1, a: 1, src: "/images/image-30.jpeg", alt: "Rooftop evenings", caption: "Rooftop evenings", sample: true },
  { i: 1, a: 1, src: "/images/image-26.jpeg", alt: "Club lounge", caption: "Club lounge", sample: false },
  { i: 0, a: 0, src: "/images/image-29.jpeg", alt: "Restaurant", caption: "Restaurant", sample: true },
];

interface DiningOption {
  id: string; name: string; description: string; price: string;
  category: string; active: boolean;
}

export default function Dining() {
  const { t } = useApp();
  const fanRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<DiningOption[]>([]);

  useEffect(() => {
    fetch("/api/dining").then(r => r.json())
      .then((data: DiningOption[]) => setOptions(data.filter(d => d.active)))
      .catch(() => {});
  }, []);

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
          <p style={{ marginTop: 24 }}>{t("dining.subtitle")}</p>
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

      {options.length > 0 && (
        <div className="wrap">
          <div className="head" style={{ marginTop: 48 }}>
            <h2>{t("dining.menu")}</h2>
            <p>{t("dining.menuSubtitle")}</p>
          </div>
          <div className="dining-grid">
            {options.map(opt => (
              <div key={opt.id} className="dining-card" data-reveal>
                <div className="dining-cat">{opt.category.replace("-", " ")}</div>
                <h3>{opt.name}</h3>
                <p>{opt.description}</p>
                <div className="dining-price">{opt.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
