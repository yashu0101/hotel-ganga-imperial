import type { NextConfig } from "next";
import { IMAGE_REDIRECTS } from "./src/lib/image-redirects";

const isDev = process.env.NODE_ENV !== "production";

// A Vercel deployment has a read-only filesystem, so without a database every guest request
// would fail. Refuse to build a production deployment rather than ship a site that can't save.
if (process.env.VERCEL_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for production deployments: guest requests cannot be saved without it.");
}

// Next.js inlines its bootstrap scripts and the theme script in layout.tsx, so scripts need
// 'unsafe-inline' unless every page is rendered dynamically with nonces. The policy still blocks
// third-party scripts, framing, plugins and form posts to other sites.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // End-to-end tests run their own dev server in a separate folder, so they can run beside `npm run dev`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  // Ship the local content file with every server function, so the JSON fallback can still
  // serve rooms and packages (read-only) on a serverless host without DATABASE_URL.
  outputFileTracingIncludes: { "/**": ["./data/db.json"] },
  async redirects() {
    return IMAGE_REDIRECTS.map(([from, to]) => ({
      source: "/images/" + from,
      destination: "/images/" + to,
      permanent: true,
    }));
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/(admin|login)(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
