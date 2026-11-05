"use client";

import { useEffect } from "react";

const SELECTORS = ".reveal-luxury, .reveal-left-l, .reveal-right-l, .reveal-scale-l, .text-glow, .brass-underline, .amen-icon-enter, .sec-divider";

export default function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
      document.querySelectorAll(SELECTORS).forEach(el => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.1 }
    );

    const els = document.querySelectorAll(SELECTORS);
    els.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
