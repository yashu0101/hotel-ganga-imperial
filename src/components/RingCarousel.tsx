"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { GALLERY_IMAGES } from "@/lib/config";

export default function RingCarousel() {
  const ringRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const stage = stageRef.current;
    if (!ring || !stage) return;

    const items = GALLERY_IMAGES.slice(0, 16);
    const n = items.length;
    const step = 360 / n;
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

    const setSize = () => {
      const cw = Math.max(120, Math.min(190, stage.clientWidth * .14));
      const rad = Math.round((cw / 2) / Math.tan(Math.PI / n) + 30);
      ring.style.setProperty("--cw", cw + "px");
      ring.style.setProperty("--rad", rad + "px");
      ring.style.setProperty("--step", step + "deg");
      stage.style.perspective = (rad * 3) + "px";
    };
    setSize();
    window.addEventListener("resize", setSize);

    let angle = 0, target = 0, last = performance.now();
    let drag: { x: number; t: number } | null = null;
    let scrollBase = 0;
    const sec = stage.closest("section") || stage;

    const onScroll = () => {
      const r = sec.getBoundingClientRect();
      scrollBase = -(r.top) * .12;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, t: target };
      stage.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (drag) target = drag.t + (e.clientX - drag.x) * .35;
    };
    const onUp = () => { drag = null; };

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);

    const prevBtn = document.getElementById("ring-prev");
    const nextBtn = document.getElementById("ring-next");
    if (prevBtn) prevBtn.onclick = () => { target += step; };
    if (nextBtn) nextBtn.onclick = () => { target -= step; };

    let vis = true;
    const obs = new IntersectionObserver(e => { vis = e[0].isIntersecting; });
    obs.observe(stage);

    const tick = (t: number) => {
      requestAnimationFrame(tick);
      if (!vis) { last = t; return; }
      const dt = Math.min(50, t - last); last = t;
      if (!drag && !reduce) target -= dt * .004;
      angle += ((target + scrollBase) - angle) * (reduce ? 1 : .08);
      ring.style.setProperty("--ra", angle.toFixed(2) + "deg");
    };
    requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", setSize);
      window.removeEventListener("scroll", onScroll);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      obs.disconnect();
    };
  }, []);

  const items = GALLERY_IMAGES.slice(0, 16);

  return (
    <section className="ring-sec" id="tour">
      <div className="wrap">
        <div className="head">
          <h2>Take a look around</h2>
          <p>Drag, scroll or use the arrows to turn the view.</p>
        </div>
      </div>
      <div className="ring-stage" ref={stageRef} aria-roledescription="carousel" aria-label="Photo tour of the hotel">
        <div className="ring" ref={ringRef}>
          {items.map((photo, k) => (
            <figure key={k} style={{ "--k": k } as React.CSSProperties}>
              <Image src={photo.src} alt={photo.caption} width={190} height={238} loading="lazy" draggable={false} />
              <figcaption>{photo.caption}</figcaption>
            </figure>
          ))}
        </div>
        <div className="ring-floor" />
      </div>
      <div className="ring-ctrl">
        <button id="ring-prev" aria-label="Turn left">&lsaquo;</button>
        <button id="ring-next" aria-label="Turn right">&rsaquo;</button>
      </div>
    </section>
  );
}
