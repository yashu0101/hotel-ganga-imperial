"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { GALLERY_IMAGES } from "@/lib/config";
export default function Gallery() {
    const [current, setCurrent] = useState<number | null>(null);
    const dialog = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const isOpen = current !== null;
    useEffect(() => { if (!isOpen)
        return; const el = dialog.current; if (!el)
        return; el.showModal(); const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { el.close(); document.body.style.overflow = old; trigger.current?.focus(); }; }, [isOpen]);
    function close() { setCurrent(null); }
    function move(delta: number) { setCurrent(value => value === null ? null : (value + delta + GALLERY_IMAGES.length) % GALLERY_IMAGES.length); }
    return <section className="gallery" id="gallery"><div className="wrap"><span className="eyebrow">A CLOSER LOOK</span><div className="head"><h2>Picture your time here</h2><p>A selection of interiors and shared spaces. Images are representative; ask us about your chosen room.</p></div><div className="g-grid">{GALLERY_IMAGES.map((p, i) => <button key={p.src} type="button" onClick={e => { trigger.current = e.currentTarget; setCurrent(i); }} aria-label={'View ' + p.caption}><Image src={p.src} alt={p.caption} width={480} height={360} sizes="(max-width:800px) 50vw, 25vw"/></button>)}</div></div>{current !== null && <dialog className="photo-dialog" ref={dialog} aria-label="Hotel photo viewer" onCancel={close} onClick={e => { if (e.target === e.currentTarget)
        close(); }} onKeyDown={e => { if (e.key === 'ArrowLeft')
        move(-1); if (e.key === 'ArrowRight')
        move(1); }}><button className="photo-close" type="button" onClick={close} aria-label="Close photo viewer">✕</button><Image src={GALLERY_IMAGES[current].src} alt={GALLERY_IMAGES[current].caption} width={1200} height={850} sizes="90vw"/><div className="photo-controls"><button onClick={() => move(-1)} aria-label="Previous photo">←</button><p aria-live="polite">{GALLERY_IMAGES[current].caption} · {current + 1} / {GALLERY_IMAGES.length}</p><button onClick={() => move(1)} aria-label="Next photo">→</button></div></dialog>}</section>;
}
