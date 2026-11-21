"use client";
import { useEffect } from "react";

// Elements that rise into place as they scroll into view (home page sections and interior pages).
// Keep in sync with the transition list under "6. Motion" in globals.css.
const REVEAL = [
  ".intro-media",
  ".intro > div:last-child",
  ".head",
  ".stay-card",
  ".amen-feature .tile",
  ".banquet-card",
  ".dining-card",
  ".g-grid button",
  ".footer-top > *",
  ".footer-river",
  ".interior-page main > section",
  ".interior-page main > .wrap:not(.page-intro)",
].join(", ");

export default function MotionEffects() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const setup = () => {
      observer?.disconnect();
      const elements = document.querySelectorAll(REVEAL);
      elements.forEach((element, index) => {
        element.classList.remove("motion-pending");
        (element as HTMLElement).style.setProperty("--reveal-delay", `${(index % 3) * 90}ms`);
      });
      if (media.matches) return;
      observer = new IntersectionObserver(
        entries =>
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.remove("motion-pending");
              observer?.unobserve(entry.target);
            }
          }),
        { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
      );
      elements.forEach(element => {
        if (element.getBoundingClientRect().top > window.innerHeight) {
          element.classList.add("motion-pending");
          observer?.observe(element);
        }
      });
    };
    setup();
    media.addEventListener("change", setup);
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", setup);
      document.querySelectorAll(".motion-pending").forEach(el => el.classList.remove("motion-pending"));
    };
  }, []);
  return null;
}
