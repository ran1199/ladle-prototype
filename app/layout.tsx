import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Fonts are downloaded at build time and served from this site (no Google requests from visitors).
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Ladle: calorie tracking for home cooks",
  description:
    "A UX case study prototype: import a recipe once, snap your plate, and Ladle estimates your share.",
  applicationName: "Ladle",
  appleWebApp: { capable: true, title: "Ladle", statusBarStyle: "default" },
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
