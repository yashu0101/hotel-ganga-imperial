import type { Metadata } from "next";
import "./globals.css";
import "./hospitality.css";
import { Marcellus, Mulish } from "next/font/google";
import { AppProvider } from "@/lib/context";

// Self-hosted by next/font: no third-party request, no layout shift while fonts load.
const display = Marcellus({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });
const body = Mulish({ subsets: ["latin"], display: "swap", variable: "--font-body" });

// Runs before first paint: applies the saved theme, and marks returning visitors (same session or
// arriving from another page of this site) so CSS hides the welcome gates without a flash.
// Kept as plain ES5 because it runs before any bundle loads.
const BEFORE_PAINT_SCRIPT = `(function () {
  var root = document.documentElement;
  try {
    var theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark") {
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    }
  } catch (e) {}
  try {
    var internal = document.referrer && new URL(document.referrer).origin === location.origin;
    if (internal || sessionStorage.getItem("welcome-seen")) root.dataset.welcomeSeen = "1";
  } catch (e) {}
})();`;

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  robots: { index: process.env.SITE_READY_FOR_INDEXING === "true", follow: true },
  openGraph: {
    title: "Hotel Ganga Imperial",
    description: "A warmer welcome. Explore rooms, dining and celebrations.",
    ...(process.env.NEXT_PUBLIC_SITE_URL
      ? {
          images: [
            { url: "/images/og-image.jpg", width: 1200, height: 630, alt: "Hotel Ganga Imperial exterior at night" },
          ],
        }
      : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: "Hotel Ganga Imperial",
    description: "A warmer welcome. Explore rooms, dining and celebrations.",
    ...(process.env.NEXT_PUBLIC_SITE_URL ? { images: ["/images/og-image.jpg"] } : {}),
  },
  title: "Hotel Ganga Imperial - Rooms, rooftop pool & banquet hall",
  description:
    "Hotel Ganga Imperial: premium rooms, a rooftop swimming pool, banquet hall, spa, gym, club lounge and 24/7 security.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-scroll-behavior: globals.css scrolls smoothly; this lets Next.js switch that off during route changes.
    <html
      lang="en"
      data-theme="dark"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: BEFORE_PAINT_SCRIPT,
          }}
        />
        <noscript>
          <style>{`.welcome-gates{display:none}`}</style>
        </noscript>
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
