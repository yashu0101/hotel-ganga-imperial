"use client";

import { useEffect, useRef, useState } from "react";
import { EXPERIENCE_STEPS } from "@/lib/config";
import Image from "next/image";

const B3D_PICS = [
  { step: 0, pos: "p1", src: "/images/image-6.jpeg", alt: "Hotel entrance", sample: false },
  { step: 0, pos: "p2", src: "/images/image-7.jpeg", alt: "Reception area", sample: true },
  { step: 1, pos: "p1", src: "/images/image-10.jpeg", alt: "Premium room", sample: false },
  { step: 1, pos: "p2", src: "/images/image-11.jpeg", alt: "Room detail", sample: true },
  { step: 2, pos: "p1", src: "/images/image-8.jpeg", alt: "Rooftop pool", sample: false },
  { step: 2, pos: "p2", src: "/images/image-23.jpeg", alt: "Pool view", sample: false },
  { step: 3, pos: "p1", src: "/images/image-13.jpeg", alt: "Banquet hall", sample: false },
  { step: 3, pos: "p2", src: "/images/image-27.jpeg", alt: "Wedding setup", sample: true },
];

export default function Experience() {
  const sectionRef = useRef<HTMLElement>(null);
  const bldRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const bld = bldRef.current;
    if (!section || !bld) return;

    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    // Generate windows
    bld.querySelectorAll(".f-front,.f-back").forEach(f => {
      if (!f.querySelector(".win")) {
        for (let i = 0; i < 24; i++) {
          const w = document.createElement("div");
          w.className = "win";
          f.insertBefore(w, f.firstChild);
        }
      }
    });
    bld.querySelectorAll(".f-left,.f-right").forEach(f => {
      if (!f.querySelector(".win")) {
        for (let i = 0; i < 18; i++) {
          const w = document.createElement("div");
          w.className = "win";
          f.insertBefore(w, f.firstChild);
        }
      }
    });

    const wins = [...bld.querySelectorAll(".win")];
    const order = wins.map((w, i) => ({ w, k: Math.sin(i * 12.9898) * 43758.5453 % 1 }))
      .sort((a, b) => Math.abs(a.k) - Math.abs(b.k))
      .map(o => o.w);

    let lastStep = 0;
    let ticking = false;
    const hero = document.querySelector(".hero-media") as HTMLElement;
    const reveals = [...document.querySelectorAll("[data-reveal]")];

    const frame = () => {
      ticking = false;
      const vh = window.innerHeight;
      const r = section.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh), 0, 1);

      bld.style.setProperty("--ry", (-30 + p * 330) + "deg");
      bld.style.setProperty("--rx", (-14 - Math.sin(p * Math.PI) * 10) + "deg");
      bld.style.setProperty("--door", String(clamp(1 - p * 4, 0, 1)));
      bld.style.setProperty("--pool", String(clamp((p - .45) * 4, 0, 1) * clamp((1 - p) * 5, 0.4, 1)));

      const lit = Math.round(clamp((p - .12) * 2.2, 0, 1) * order.length);
      order.forEach((w, i) => w.classList.toggle("lit", i < lit));

      const st = Math.min(EXPERIENCE_STEPS.length - 1, Math.floor(p * EXPERIENCE_STEPS.length));
      if (st !== lastStep) { lastStep = st; setActiveStep(st); }
      setProgress(p);

      if (!reduce && hero) {
        hero.style.setProperty("--hs", String(1 + clamp(window.scrollY / vh, 0, 1) * .08));
      }

      if (!reduce) {
        for (const el of reveals) {
          const b = el.getBoundingClientRect();
          if (b.bottom < -50 || b.top > vh + 50) continue;
          (el as HTMLElement).style.setProperty("--t", clamp((vh - b.top) / (vh * .55), 0, 1).toFixed(3));
        }
      }
    };

    const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    frame();

    return () => {
      window.removeEventListener("scroll", req);
      window.removeEventListener("resize", req);
    };
  }, []);

  return (
    <section className="b3d" id="experience" ref={sectionRef} aria-label="Explore the hotel">
      <div className="b3d-sticky">
        <div className="b3d-steps">
          {EXPERIENCE_STEPS.map((step, i) => (
            <div key={i} className={`b3d-step${i === activeStep ? " on" : ""}`}>
              <h2>{step.title}</h2>
              <p>{step.description}</p>
            </div>
          ))}
          <div className="b3d-bar" style={{ "--p": progress } as React.CSSProperties}><i /></div>
        </div>
        <div className="scene">
          <div className="b3d-pics">
            {B3D_PICS.map((pic, i) => (
              <figure key={i} className={`b3d-pic ${pic.pos}${pic.step === activeStep ? " on" : ""}`}>
                {pic.sample && <span className="chip">Sample photo</span>}
                <Image src={pic.src} alt={pic.alt} width={400} height={300} loading="lazy" />
              </figure>
            ))}
          </div>
          <div className="bld" ref={bldRef}>
            <div className="face f-base" />
            <div className="face f-front">
              <div className="canopy" />
              <div className="sign">GANGA IMPERIAL</div>
              <div className="door3d" />
            </div>
            <div className="face f-right"><div className="canopy" /></div>
            <div className="face f-back"><div className="canopy" /></div>
            <div className="face f-left"><div className="canopy" /></div>
            <div className="face f-top"><div className="pool" /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
