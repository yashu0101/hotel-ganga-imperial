"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { EXPERIENCE_STEPS } from "@/lib/config";

// Desktop: scrolling through the tall sticky section turns the building.
// Phones and small tablets (<=900px) and reduced motion: the section is normal height and the 01-04 buttons turn it.
const COMPACT = "(max-width: 900px)";
export default function Experience() {
  const sectionRef = useRef<HTMLElement>(null);
  const buildingRef = useRef<HTMLDivElement>(null);
  const goTo = useRef<(index: number) => void>(() => {});
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const section = sectionRef.current;
    const building = buildingRef.current;
    if (!section || !building) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia(COMPACT);
    let frame = 0,
      current = 0,
      target = 0,
      step = 0,
      chosen = 0;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const draw = () => {
      current = motion.matches ? target : current + (target - current) * 0.12;
      if (Math.abs(target - current) < 0.0003) current = target;
      building.style.setProperty("--ry", `${motion.matches ? -30 : -30 + current * 300}deg`);
      building.style.setProperty("--rx", `${motion.matches ? -14 : -14 - Math.sin(current * Math.PI) * 8}deg`);
      building.style.setProperty("--pool", String(clamp((current - 0.35) * 3)));
      section.style.setProperty("--p", String(current));
      if (!compact.matches) {
        const next = Math.min(3, Math.floor(current * 4));
        if (next !== step) {
          step = next;
          setActiveStep(next);
        }
      }
      frame = current !== target ? requestAnimationFrame(draw) : 0;
    };
    const update = () => {
      if (motion.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        building.style.setProperty("--ry", "-30deg");
        building.style.setProperty("--rx", "-14deg");
        return;
      }
      target = compact.matches
        ? (chosen + 0.35) / 4
        : clamp(-section.getBoundingClientRect().top / Math.max(1, section.offsetHeight - window.innerHeight));
      if (!frame) frame = requestAnimationFrame(draw);
    };
    goTo.current = (index: number) => {
      if (motion.matches || compact.matches) {
        chosen = step = index;
        setActiveStep(index);
        update();
        return;
      }
      const distance = section.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: window.scrollY + section.getBoundingClientRect().top + distance * ((index + 0.35) / 4),
        behavior: "smooth",
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    motion.addEventListener("change", update);
    compact.addEventListener("change", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      motion.removeEventListener("change", update);
      compact.removeEventListener("change", update);
    };
  }, []);
  const select = (index: number) => goTo.current(index);
  const windows = (count: number) =>
    Array.from({ length: count }, (_, i) => (
      <div className="win lit" key={i} style={{ animationDelay: `${i * 45}ms` }} />
    ));
  return (
    <section
      className="b3d restored-experience"
      id="experience"
      ref={sectionRef}
      aria-label="Interactive architectural hotel illustration"
    >
      <div className="b3d-sticky">
        <div className="experience-copy">
          <span className="eyebrow">EXPLORE GANGA IMPERIAL</span>
          <p className="experience-hint">
            Scroll, or choose a number, to turn the building and discover each experience.
          </p>
          <div className="experience-story" aria-live="polite">
            <div key={activeStep} className="experience-story-inner">
              <span className="experience-index">0{activeStep + 1} / 04</span>
              <h2>{EXPERIENCE_STEPS[activeStep].title}</h2>
              <p>{EXPERIENCE_STEPS[activeStep].description}</p>
            </div>
          </div>
          <div className="experience-controls" aria-label="Choose an experience">
            {EXPERIENCE_STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={s.title}
                aria-pressed={activeStep === i}
                onClick={() => select(i)}
              >
                0{i + 1}
              </button>
            ))}
          </div>
          <div className="experience-track" aria-hidden="true">
            <i />
          </div>
          <button className="replay-welcome" onClick={() => window.dispatchEvent(new Event("replay-hotel-welcome"))}>
            Replay the welcome ↻
          </button>
        </div>
        <div className="scene" aria-hidden="true">
          <div className="building-halo" />
          <div className="bld" ref={buildingRef}>
            <div className="face f-base" />
            <div className="face f-front">
              {windows(24)}
              <div className="canopy" />
              <div className="sign">GANGA IMPERIAL</div>
              <div className="door3d" />
            </div>
            <div className="face f-right">
              {windows(18)}
              <div className="canopy" />
            </div>
            <div className="face f-back">
              {windows(24)}
              <div className="canopy" />
            </div>
            <div className="face f-left">
              {windows(18)}
              <div className="canopy" />
            </div>
            <div className="face f-top">
              <div className="pool" />
            </div>
          </div>
          <figure className="experience-photo" key={activeStep}>
            <Image
              src={EXPERIENCE_STEPS[activeStep].image}
              alt=""
              width={320}
              height={220}
              sizes="(max-width:900px) 120px, 180px"
            />
            <figcaption>Representative imagery</figcaption>
          </figure>
          <span className="model-label">ARCHITECTURAL ILLUSTRATION</span>
        </div>
      </div>
    </section>
  );
}
