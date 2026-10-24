"use client";

import { useEffect, useRef, useState } from "react";
import { EXPERIENCE_STEPS } from "@/lib/config";
import Image from "next/image";

export default function Experience() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    const onScroll = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp(-r.top / (r.height - vh), 0, 1);
      const st = Math.min(EXPERIENCE_STEPS.length - 1, Math.floor(p * EXPERIENCE_STEPS.length));
      setActiveStep(st);

      const bar = section.querySelector(".b3d-bar i") as HTMLElement;
      if (bar) bar.style.width = `${p * 100}%`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
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
          <div className="b3d-bar"><i /></div>
        </div>
        <div className="scene">
          <div className="b3d-pics">
            {EXPERIENCE_STEPS.map((step, i) => (
              <figure key={i} className={`b3d-pic${i === activeStep ? " on" : ""}`}>
                <Image src={step.image} alt={step.title} width={600} height={400} />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
