"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";

const items = [
  { href: "#about", label: "Our story", desktop: "About", detail: "A warmer welcome" },
  { href: "#rooms", label: "Rooms & suites", desktop: "Stay", detail: "Find your quiet retreat" },
  { href: "#amenities", label: "Unwind", desktop: "Amenities", detail: "Pool, spa & everyday comforts" },
  { href: "#events", label: "Celebrate", desktop: "Celebrate", detail: "Make an occasion of it" },
  { href: "#dining", label: "Dine with us", desktop: "Dining", detail: "Good food, shared moments" },
  { href: "#gallery", label: "Take a look", desktop: "Gallery", detail: "A glimpse of Ganga Imperial" },
];

export default function Header() {
  const { theme, setTheme } = useApp();
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); button.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nav.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
      if (e.key === "Tab") {
        const nodes = [button.current, ...Array.from(nav.current?.querySelectorAll<HTMLElement>("a,button") || [])].filter(Boolean) as HTMLElement[];
        const index = nodes.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && index === 0) { e.preventDefault(); nodes[nodes.length - 1]?.focus(); }
        else if (!e.shiftKey && index === nodes.length - 1) { e.preventDefault(); nodes[0]?.focus(); }
      }
    };
    const onResize = () => { if (window.innerWidth > 1100) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [open]);

  return <header className={"site-header solid" + (open ? " menu-is-open" : "")}>
    <div className="wrap bar">
      <a href="#home" className="wordmark" aria-label="Hotel Ganga Imperial, home"><small>Hotel</small>Ganga Imperial</a>
      <button ref={button} className="menu-btn" aria-controls="main-navigation" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}><span/><span/><span/></button>
      <nav ref={nav} id="main-navigation" className={"nav" + (open ? " open" : "")} aria-label="Main">
        <div className="mobile-menu-intro"><span>EXPLORE THE IMPERIAL</span><p>Make yourself at home.</p></div>
        <div className="nav-links">{items.map((item, index) => <a href={item.href} key={item.href} onClick={close} className="menu-destination" style={{ "--menu-order": index } as React.CSSProperties}>
          <span className="menu-number" aria-hidden="true">0{index + 1}</span>
          <span className="menu-link-copy"><span className="desktop-menu-label">{item.desktop}</span><span className="mobile-menu-label">{item.label}</span><small>{item.detail}</small></span>
          <span className="menu-arrow" aria-hidden="true">↗</span>
        </a>)}</div>
        <div className="menu-reservation"><span className="mobile-menu-label menu-reservation-label">YOUR NEXT STAY STARTS HERE</span><Link className="cta" href="/book" onClick={close}>Request a stay <span aria-hidden="true">↗</span></Link><small>Share your dates. We handle the details.</small></div>
        <div className="menu-utilities"><span className="mobile-menu-label">A setting for every mood</span><button className="ctrl-btn" aria-label={"Switch to " + (theme === "dark" ? "light" : "dark") + " theme"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span><span className="mobile-menu-label">{theme === "dark" ? "Light view" : "Dark view"}</span></button></div>
      </nav>
    </div>
  </header>;
}
