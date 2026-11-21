"use client";
import { useApp } from "@/lib/context";

function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {dark ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </>
      ) : (
        <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" />
      )}
    </svg>
  );
}

/** The one theme switch used in every header: a round icon button. `menuLabel` adds the text shown in the mobile menu. */
export default function ThemeToggle({ menuLabel = false }: { menuLabel?: boolean }) {
  const { theme, setTheme } = useApp();
  const dark = theme === "dark";
  const label = dark ? "Light view" : "Dark view";
  return (
    <button
      type="button"
      className="theme-btn"
      // Matches the visible mobile label (WCAG 2.5.3); elsewhere only the icon shows.
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <ThemeIcon dark={dark} />
      {menuLabel && <span className="mobile-menu-label">{label}</span>}
    </button>
  );
}
