import type { MetadataRoute } from "next";

// Lets visitors add Ladle to their iPhone or Android home screen; it then opens full screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ladle",
    short_name: "Ladle",
    description: "Calorie tracking for home cooks. A UX case study prototype.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7F0",
    theme_color: "#FBF7F0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
