import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Fonts are downloaded at build time and served from this site (no Google requests from visitors).
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Scales the desktop phone mock-up (868 px tall) to fit short screens, keeping its
// layout identical everywhere. Runs before the first paint and on every resize.
const FRAME_ZOOM_SCRIPT = `(function(){var d=document.documentElement;function f(){var z=Math.min(1,(window.innerHeight-48)/868);d.style.setProperty("--frame-zoom",String(Math.max(0.6,z)))}f();window.addEventListener("resize",f)})();`;

const TITLE = "Ladle: calorie tracking for home cooks";
const DESCRIPTION =
  "A UX case study prototype: import a recipe once, snap your plate, and Ladle estimates your share.";

// The preview image for shared links is app/opengraph-image.png (and twitter-image.png).
export const metadata: Metadata = {
  metadataBase: new URL("https://ladle-prototype.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Ladle",
  appleWebApp: { capable: true, title: "Ladle", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Ladle",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1814" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The inline script sets --frame-zoom on <html> before React loads, so React
    // is told not to warn about that one attribute.
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: FRAME_ZOOM_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
