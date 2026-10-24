"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/context";

export default function Hero() {
  const { t } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let w: number, h: number, run = true;
    interface Particle { x: number; y: number; r: number; v: number; ph: number; z: number; }
    const parts: Particle[] = [];
    const size = () => {
      const r = c.getBoundingClientRect();
      const d = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height; c.width = w * d; c.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    size(); window.addEventListener("resize", size);
    for (let i = 0; i < 46; i++) parts.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3.2, v: 0.0006 + Math.random() * 0.0016, ph: Math.random() * 6.28, z: Math.random() });
    const obs = new IntersectionObserver((e) => { run = e[0].isIntersecting; }); obs.observe(c);
    const tick = (t: number) => {
      requestAnimationFrame(tick); if (!run) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.y -= p.v * (0.5 + p.z); if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        const px = (p.x + Math.sin(t / 2400 + p.ph) * 0.015) * w, py = p.y * h;
        const a = 0.25 + 0.45 * Math.abs(Math.sin(t / 1400 + p.ph));
        const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 4);
        g.addColorStop(0, `rgba(226,198,142,${a})`); g.addColorStop(1, "rgba(226,198,142,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
    };
    requestAnimationFrame(tick);
    return () => { window.removeEventListener("resize", size); obs.disconnect(); };
  }, []);

  return (
    <section className="hero" id="home" aria-label="Welcome">
      <div className="wrap-free hero-inner">
        <h1>{t("hero.title")}</h1>
        <div className="rule" />
        <p>{t("hero.subtitle")}</p>
        <div className="btns">
          <a className="btn btn-solid" href="/book">{t("hero.book")}</a>
          <a className="btn btn-ghost" href="#rooms">{t("hero.rooms")}</a>
        </div>
      </div>
      <div className="hero-media" role="img" aria-label="Hotel Ganga Imperial building">
        <canvas className="hero-fx" ref={canvasRef} aria-hidden="true" />
      </div>
    </section>
  );
}
