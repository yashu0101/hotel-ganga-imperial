"use client";

import { useState } from "react";
import Image from "next/image";
import { NAV_ITEMS, GALLERY_IMAGES } from "@/lib/config";

const STRIP_INDICES = [0, 2, 3, 5, 7, 8, 12, 15];

export default function Footer() {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const show = (i: number) => setLightbox(((i % GALLERY_IMAGES.length) + GALLERY_IMAGES.length) % GALLERY_IMAGES.length);

  return (
    <>
      <footer style={{ paddingTop: 0 }}>
        <div className="foot-strip">
          {STRIP_INDICES.map((idx) => (
            <button key={idx} type="button" onClick={() => show(idx)} aria-label={`Open photo: ${GALLERY_IMAGES[idx]?.caption || ""}`}>
              <Image src={GALLERY_IMAGES[idx]?.src || "/images/image-0.jpeg"} alt="" width={200} height={200} loading="lazy" />
            </button>
          ))}
        </div>
        <div style={{ height: 56 }} />
        <div className="wrap">
          <div>
            <div className="wordmark" style={{ textShadow: "none" }}>
              <small>Hotel</small>Ganga Imperial
            </div>
            <p style={{ margin: "14px 0 0" }}>
              &copy; {new Date().getFullYear()} Hotel Ganga Imperial
            </p>
          </div>
          <nav aria-label="Footer">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href}>{item.label}</a>
            ))}
            <a href="#enquire">Enquire</a>
          </nav>
        </div>
      </footer>
      {lightbox !== null && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)} role="dialog" aria-label="Photo viewer">
          <div className="lb-inner" onClick={(e) => e.stopPropagation()}>
            <Image src={GALLERY_IMAGES[lightbox].src} alt={GALLERY_IMAGES[lightbox].caption} width={1200} height={800} priority />
          </div>
          <button className="lb-btn lb-close" onClick={() => setLightbox(null)} aria-label="Close">&#10005;</button>
          <button className="lb-btn lb-prev" onClick={() => show(lightbox - 1)} aria-label="Previous">&#8249;</button>
          <button className="lb-btn lb-next" onClick={() => show(lightbox + 1)} aria-label="Next">&#8250;</button>
          <div className="lb-cap">{GALLERY_IMAGES[lightbox].caption} ({lightbox + 1} of {GALLERY_IMAGES.length})</div>
        </div>
      )}
    </>
  );
}
