"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/context";

const NAV_KEYS = [
  { href: "#home", key: "nav.home" },
  { href: "#about", key: "nav.about" },
  { href: "#rooms", key: "nav.rooms" },
  { href: "#amenities", key: "nav.amenities" },
  { href: "#events", key: "nav.banquet" },
  { href: "#dining", key: "nav.dining" },
  { href: "#gallery", key: "nav.gallery" },
];

export default function Header() {
  const { t, lang, setLang, theme, setTheme } = useApp();
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");

  const updateScroll = useCallback(() => {
    setSolid(window.scrollY > 40);
    const line = window.innerHeight * 0.4;
    let cur = "home";
    for (const item of NAV_KEYS) {
      const el = document.querySelector(item.href);
      if (el && el.getBoundingClientRect().top <= line) cur = item.href.slice(1);
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
          onClick={() => {
            setMenuOpen(!menuOpen);
            document.body.style.overflow = !menuOpen ? "hidden" : "";
          }}
        >
          <span /><span /><span />
        </button>
        <nav className={`nav${menuOpen ? " open" : ""}`} aria-label="Main">
          {NAV_KEYS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={activeId === item.href.slice(1) ? "true" : undefined}
              onClick={() => { setMenuOpen(false); document.body.style.overflow = ""; }}
            >
              {t(item.key)}
            </a>
          ))}
          <a className="cta" href="/book" onClick={() => { setMenuOpen(false); document.body.style.overflow = ""; }}>
            {t("nav.book")}
          </a>
          <div className="header-controls">
            <button
              className="ctrl-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              title={theme === "dark" ? t("theme.light") : t("theme.dark")}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button
              className="ctrl-btn"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              aria-label="Toggle language"
            >
              {lang === "en" ? "हि" : "EN"}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
