import type { Metadata } from "next";
import "./globals.css";
import "./hospitality.css";
import { Marcellus, Mulish } from "next/font/google";
import { AppProvider } from "@/lib/context";

// Self-hosted by next/font: no third-party request, no layout shift while fonts load.
const display = Marcellus({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });
const body = Mulish({ subsets: ["latin"], display: "swap", variable: "--font-body" });

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  robots: { index: process.env.SITE_READY_FOR_INDEXING === "true", follow: true },
  openGraph: {
    title: "Hotel Ganga Imperial",
    description: "A warmer welcome. Explore rooms, dining and celebrations.",
    ...(process.env.NEXT_PUBLIC_SITE_URL
      ? {
          images: [
            { url: "/images/image-43.jpeg", width: 1020, height: 850, alt: "Hotel Ganga Imperial exterior at night" },
          ],
        }
      : {}),
  },
  title: "Hotel Ganga Imperial - Rooms, rooftop pool & banquet hall",
  description:
    "Hotel Ganga Imperial: premium rooms, a rooftop swimming pool, banquet hall, spa, gym, club lounge and 24/7 security.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}}catch(e){}try{var internal=document.referrer&&new URL(document.referrer).origin===location.origin;if(internal||sessionStorage.getItem('welcome-seen'))document.documentElement.dataset.welcomeSeen='1'}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
