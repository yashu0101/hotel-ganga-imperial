// Line icons for the admin dashboard (24px grid, drawn with currentColor). Decorative only:
// every icon sits next to a visible label or inside a control with an accessible name.
const PATHS = {
  today: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  requests: (
    <>
      <path d="M5.5 5h13l2.5 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
      <path d="M3 13h5l1.5 3h5l1.5-3h5" />
    </>
  ),
  enquiries: <path d="M4 5h16v11H9l-5 4z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  rooms: (
    <>
      <path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6" />
      <circle cx="7" cy="11.5" r="1.6" />
    </>
  ),
  offers: (
    <>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.3" />
    </>
  ),
  banquet: (
    <>
      <path d="M4 21h16M5 21v-7h14v7M5 17c2.3 1.4 4.7 1.4 7 0s4.7-1.4 7 0M12 14v-3" />
      <path d="M12 8.5c-.9-.8-.9-2.1 0-3.2.9 1.1.9 2.4 0 3.2z" />
    </>
  ),
  dining: <path d="M7 3v18M5 3v5a2 2 0 0 0 4 0V3M17 21V3c-2 1.5-3 4-3 7v3h3" />,
  reviews: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" />,
  analytics: <path d="M4 20h16M7 16v-5M12 16V6M17 16V9" />,
  setup: (
    <>
      <path d="M4 7h9M18 7h2M4 17h3M12 17h8" />
      <circle cx="15.5" cy="7" r="2.2" />
      <circle cx="9.5" cy="17" r="2.2" />
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
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  signout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  left: <path d="m15 6-6 6 6 6" />,
  right: <path d="m9 6 6 6-6 6" />,
  alert: <path d="M12 4 2.5 20h19zM12 10v4M12 17v.01" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  guests: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5a6.5 6.5 0 0 1 3 5.5" />
    </>
  ),
  arrive: <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M14 16l4-4-4-4M18 12H8" />,
  leave: <path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 16l-4-4 4-4M6 12h10" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
  sliders: <path d="M4 6h9M17 6h3M15 4v4M4 12h3M11 12h9M9 10v4M4 18h11M19 18h1M17 16v4" />,
  restore: <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
};
export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="adm-icon"
      width={size}
      height={size}
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
