"use client";
import { useEffect, useState } from "react";

// The welcome gates play once per browser session, on a guest's first homepage view.
// The inline script in layout.tsx sets <html data-welcome-seen> before first paint for
// returning guests and for anyone arriving from another page of the site, and CSS hides
// the gates in that case, so they never flash. "Replay the welcome" still works.
// Any click, key, scroll or swipe skips the intro.
export default function DoorIntro() {
  const [phase, setPhase] = useState("closed");
  const [replaying, setReplaying] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let opening: ReturnType<typeof setTimeout>;
    let finish: ReturnType<typeof setTimeout>;
    const play = () => {
      clearTimeout(opening);
      clearTimeout(finish);
      setPhase(motion.matches ? "hidden" : "closed");
      opening = setTimeout(() => setPhase("open"), 250);
      finish = setTimeout(() => {
        setPhase("hidden");
        setReplaying(false);
      }, 1400);
    };
    const replay = () => {
      setReplaying(true);
      play();
    };
    const seen = document.documentElement.dataset.welcomeSeen === "1";
    try {
      sessionStorage.setItem("welcome-seen", "1");
    } catch {
      /* Without storage the referrer check still prevents repeats. */
    }
    // Schedule after hydration; the initial closed state supplies the entrance frame.
    const start = requestAnimationFrame(seen ? () => setPhase("hidden") : play);
    window.addEventListener("replay-hotel-welcome", replay);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(opening);
      clearTimeout(finish);
      window.removeEventListener("replay-hotel-welcome", replay);
    };
  }, []);
  useEffect(() => {
    if (phase === "hidden") return;
    const skip = () => {
      setPhase("hidden");
      setReplaying(false);
    };
    const events = ["keydown", "wheel", "touchmove"] as const;
    events.forEach(e => window.addEventListener(e, skip, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, skip));
  }, [phase]);
  if (phase === "hidden") return null;
  return (
    <div
      className={`doors welcome-gates ${phase}${replaying ? " replaying" : ""}`}
      aria-label="Welcome to Hotel Ganga Imperial"
      onClick={() => {
        setPhase("hidden");
        setReplaying(false);
      }}
    >
      <div className="door l" aria-hidden="true">
        <div className="gate-panel" />
      </div>
      <div className="door r" aria-hidden="true">
        <div className="gate-panel" />
      </div>
      <div className="crest">
        <small>WELCOME TO</small>
        <span>Ganga Imperial</span>
        <i>A warmer welcome awaits</i>
      </div>
      <button type="button" className="gate-skip">
        Skip intro <span aria-hidden="true">↗</span>
      </button>
    </div>
  );
}
