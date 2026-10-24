"use client";

import { useState, useEffect, useCallback } from "react";
import { NAV_ITEMS } from "@/lib/config";

export default function Header() {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");

  const updateScroll = useCallback(() => {
    setSolid(window.scrollY > 40);

    const line = window.innerHeight * 0.4;
    let cur = "home";
    for (const item of NAV_ITEMS) {
      const el = document.querySelector(item.href);
      if (el && el.getBoundingClientRect().top <= line) {
        cur = item.href.slice(1);
      }
    }
    setActiveId(cur);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    updateScroll();
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [updateScroll]);

  return (
    <header className={`site-header${solid ? " solid" : ""}`} id="top-bar">
      <div className="scroll-progress" id="scroll-progress" />
      <div className="wrap bar">
        <a href="#home" className="wordmark" aria-label="Hotel Ganga Imperial, home">
          <small>Hotel</small>Ganga Imperial
        </a>
        <button
          className="menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="nav"
          onClick={() => {
            setMenuOpen(!menuOpen);
            document.body.style.overflow = !menuOpen ? "hidden" : "";
          }}
        >
          <span /><span /><span />
        </button>
        <nav className={`nav${menuOpen ? " open" : ""}`} id="nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={activeId === item.href.slice(1) ? "true" : undefined}
              onClick={() => {
                setMenuOpen(false);
                document.body.style.overflow = "";
              }}
            >
              {item.label}
            </a>
          ))}
          <a
            className="cta"
            href="#enquire"
            onClick={() => {
              setMenuOpen(false);
              document.body.style.overflow = "";
            }}
          >
            Enquire
          </a>
        </nav>
      </div>
    </header>
  );
}
