"use client";
import { useEffect } from "react";
export default function MotionEffects() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const setup = () => {
      observer?.disconnect();
      const elements = document.querySelectorAll(".intro-media, .intro > div:last-child, .head, .stay-card, .amen-feature .tile, .banquet-card, .dining-card, .g-grid button, .footer-grid > div");
      elements.forEach((element, index) => {
        element.classList.remove("motion-pending");
        (element as HTMLElement).style.setProperty("--reveal-delay", `${(index % 3) * 65}ms`);
      });
      if (media.matches) return;
      observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.remove("motion-pending"); observer?.unobserve(entry.target); }
      }), { threshold: .08 });
      elements.forEach(element => {
        if (element.getBoundingClientRect().top > window.innerHeight) { element.classList.add("motion-pending"); observer?.observe(element); }
      });
    };
    setup(); media.addEventListener("change", setup);
    return () => { observer?.disconnect(); media.removeEventListener("change", setup); document.querySelectorAll(".motion-pending").forEach(el => el.classList.remove("motion-pending")); };
  }, []);
  return null;
}
