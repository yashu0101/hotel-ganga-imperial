"use client";
import { useEffect, useState } from "react";

export default function DoorIntro() {
  const [phase, setPhase] = useState("closed");
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let opening: ReturnType<typeof setTimeout>;
    let finish: ReturnType<typeof setTimeout>;
    const play = () => {
      clearTimeout(opening); clearTimeout(finish);
      setPhase(motion.matches ? "hidden" : "closed");
      opening = setTimeout(() => setPhase("open"), 350);
      finish = setTimeout(() => setPhase("hidden"), 1850);
    };
    // Schedule after hydration; the initial closed state supplies the entrance frame.
    const start = requestAnimationFrame(play);
    window.addEventListener("replay-hotel-welcome", play);
    return () => { cancelAnimationFrame(start); clearTimeout(opening); clearTimeout(finish); window.removeEventListener("replay-hotel-welcome", play); };
  }, []);
  if (phase === "hidden") return null;
  return <div className={`doors welcome-gates ${phase}`} aria-label="Welcome to Hotel Ganga Imperial">
    <div className="door l" aria-hidden="true"><div className="gate-panel" /></div>
    <div className="door r" aria-hidden="true"><div className="gate-panel" /></div>
    <div className="crest"><small>WELCOME TO</small><span>Ganga Imperial</span><i>A warmer welcome awaits</i></div>
    <button type="button" className="gate-skip" onClick={() => setPhase("hidden")}>Skip intro ↗</button>
  </div>;
}
