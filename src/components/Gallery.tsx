"use client";

import { useState } from "react";
import Image from "next/image";
import { GALLERY_IMAGES } from "@/lib/config";
import { useApp } from "@/lib/context";

export default function Gallery() {
  const { t } = useApp();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const show = (i: number) => setLightbox(((i % GALLERY_IMAGES.length) + GALLERY_IMAGES.length) % GALLERY_IMAGES.length);

  return (
    <>
      <section className="gallery" id="gallery">
        <div className="wrap">
          <div className="head"><h2>{t("gallery.title")}</h2><p>{t("gallery.subtitle")}</p></div>
          <div className="g-grid">
            {GALLERY_IMAGES.map((photo, i) => (
              <button key={i} type="button" onClick={() => show(i)} aria-label={`Open photo: ${photo.caption}`}>
                <Image src={photo.src} alt={photo.caption} width={400} height={300} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </section>
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
