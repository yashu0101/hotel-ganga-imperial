"use client";

import { useState, useEffect } from "react";

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const progress = document.querySelector(".scroll-progress") as HTMLElement;
    const onScroll = () => {
      setShow(window.scrollY > window.innerHeight);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty("--p", String(max > 0 ? window.scrollY / max : 0));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a href="#home" className={`to-top${show ? " show" : ""}`} aria-label="Back to top">
      &uarr;
    </a>
  );
}
