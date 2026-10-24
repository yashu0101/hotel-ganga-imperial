"use client";

import { useEffect, useState } from "react";

export default function DoorIntro() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
      setHidden(true);
      return;
    }
    const t1 = setTimeout(() => setOpen(true), 450);
    const t2 = setTimeout(() => setHidden(true), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (hidden) return null;

  return (
    <div className={`doors${open ? " open" : ""}`} aria-hidden="true">
      <div className="door l" />
      <div className="door r" />
      <div className="crest">GANGA IMPERIAL</div>
    </div>
  );
}
