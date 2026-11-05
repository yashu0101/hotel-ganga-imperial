import type { Metadata } from "next";
import "./globals.css";
import "./hospitality.css";
import { AppProvider } from "@/lib/context";

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? {metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL)} : {}),
  robots:{index:process.env.SITE_READY_FOR_INDEXING === "true",follow:true},
  openGraph:{title:"Hotel Ganga Imperial",description:"A warmer welcome. Explore rooms, dining and celebrations.",...(process.env.NEXT_PUBLIC_SITE_URL ? {images:[{url:"/images/image-43.jpeg",width:1200,height:800,alt:"Hotel Ganga Imperial exterior"}]} : {})},
  title: "Hotel Ganga Imperial - Rooms, rooftop pool & banquet hall",
  description:
    "Hotel Ganga Imperial: premium rooms, a rooftop swimming pool, banquet hall, spa, gym, club lounge and 24/7 security.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}}catch(e){}})()` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Marcellus&family=Mulish:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
