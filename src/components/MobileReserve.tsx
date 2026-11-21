"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * The floating "Request a reservation" bar on phones (shown by CSS at ≤900px).
 * It steps aside while another reservation button marked `data-reserve-cta` is on screen,
 * so guests never see two copies of the same action at once.
 */
export default function MobileReserve() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const targets = document.querySelectorAll("[data-reserve-cta]");
    if (!targets.length) return;
    const onScreen = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      setHidden(onScreen.size > 0);
    });
    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, []);
  return (
    <Link
      className={"mobile-reserve" + (hidden ? " is-hidden" : "")}
      href="/book"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      Request a reservation <span aria-hidden="true">↗</span>
    </Link>
  );
}
