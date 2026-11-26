"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const items = [
  { id: "about", label: "Our story", desktop: "About", detail: "A warmer welcome" },
  { id: "rooms", label: "Rooms & suites", desktop: "Stay", detail: "Find your quiet retreat" },
  { id: "amenities", label: "Unwind", desktop: "Amenities", detail: "Pool, spa & everyday comforts" },
  { id: "events", label: "Celebrate", desktop: "Celebrate", detail: "Make an occasion of it" },
  { id: "dining", label: "Dine with us", desktop: "Dining", detail: "Good food, shared moments" },
  { id: "gallery", label: "Take a look", desktop: "Gallery", detail: "A glimpse of Ganga Imperial" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const nav = useRef<HTMLElement>(null);
  const links = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  // Condense the bar once the page has moved past the top.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track which section sits in the middle band of the viewport.
  useEffect(() => {
    const sections = ["home", ...items.map(item => item.id)]
      .map(id => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.id === "home" ? "" : entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  // Slide the brass dash under the active desktop link.
  useLayoutEffect(() => {
    const row = links.current;
    if (!row) return;
    const place = () => {
      const link = row.querySelector<HTMLElement>(`[data-section="${active}"]`);
      row.style.setProperty("--mark-x", (link ? link.offsetLeft : 0) + "px");
      row.style.setProperty("--mark-w", (link ? link.offsetWidth : 0) + "px");
      row.toggleAttribute("data-has-active", Boolean(link));
    };
    place();
    window.addEventListener("resize", place);
    document.fonts?.ready.then(place);
    return () => window.removeEventListener("resize", place);
  }, [active]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nav.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
      if (e.key === "Tab") {
        const nodes = [
          button.current,
          ...Array.from(nav.current?.querySelectorAll<HTMLElement>("a,button") || []),
        ].filter(Boolean) as HTMLElement[];
        const index = nodes.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && index === 0) {
          e.preventDefault();
          nodes[nodes.length - 1]?.focus();
        } else if (!e.shiftKey && index === nodes.length - 1) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    const onResize = () => {
      if (window.innerWidth > 1100) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className={"site-header" + (scrolled ? " is-scrolled" : "") + (open ? " menu-is-open" : "")}>
      <div className="bar">
        <a href="#home" className="wordmark" aria-label="Hotel Ganga Imperial, home">
          <small>Hotel</small>Ganga Imperial
        </a>
        <button
          ref={button}
          className="menu-btn"
          aria-controls="main-navigation"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
        <nav ref={nav} id="main-navigation" className={"nav" + (open ? " open" : "")} aria-label="Main">
          <p className="mobile-menu-intro">Make yourself at home.</p>
          <div className="nav-links" ref={links}>
            <span className="nav-mark" aria-hidden="true" />
            {items.map((item, index) => (
              <a
                href={"#" + item.id}
                key={item.id}
                data-section={item.id}
                aria-current={active === item.id ? "location" : undefined}
                onClick={close}
                className="menu-destination"
                style={{ "--menu-order": index } as React.CSSProperties}
              >
                <span className="desktop-menu-label">{item.desktop}</span>
                <span className="mobile-menu-label">{item.label}</span>
                <small>{item.detail}</small>
              </a>
            ))}
          </div>
          <div className="nav-actions">
            <ThemeToggle menuLabel />
            <div className="menu-reservation">
              <Link className="cta" href="/book" onClick={close}>
                Request a reservation
              </Link>
              <small>Share your dates. We handle the details.</small>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
