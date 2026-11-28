// Line icons for the public site (24px grid, drawn with currentColor, same family as the admin icons).
// They size with the surrounding text (1em) so they line up in buttons, links and body copy alike.
// Decorative by default: every icon sits next to visible text or inside a control with an accessible name.
const PATHS = {
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  phone: <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  chat: <path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.3A8.5 8.5 0 1 1 20 11.5z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
};
export type PublicIconName = keyof typeof PATHS;

/**
 * `position` adds the gap on the side that faces the text ("end" = icon after the label).
 * Leave it out for icon-only controls, or where the parent already spaces its children with `gap`.
 */
export default function Icon({
  name,
  position,
  className,
}: {
  name: PublicIconName;
  position?: "start" | "end";
  className?: string;
}) {
  const classes = ["ui-icon", position && "ui-icon-" + position, className].filter(Boolean).join(" ");
  return (
    <svg
      className={classes}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Screen-reader note for links that open a new tab, paired with the visible external icon. */
export function NewTabNote() {
  return <span className="sr-only"> (opens in a new tab)</span>;
}
