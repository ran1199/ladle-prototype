import type { NextConfig } from "next";

// Security headers for every page. The Content Security Policy only allows
// Ladle's own files, plus what the app needs: inline styles and the small
// inline startup script, photos as data:/blob: URLs, and on-device text
// recognition (a blob: worker running WebAssembly). Vercel's preview toolbar
// (vercel.live) is allowed so preview links work. Skipped in `npm run dev`,
// which needs looser rules for hot reloading.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://vercel.live",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://vercel.live",
  "img-src 'self' data: blob: https://vercel.live https://vercel.com",
  "font-src 'self' https://vercel.live",
  "connect-src 'self' data: blob: https://vercel.live wss://ws-us3.pusher.com",
  "frame-src https://vercel.live",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: csp }]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // The camera is used for plate photos and barcodes; nothing else.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
