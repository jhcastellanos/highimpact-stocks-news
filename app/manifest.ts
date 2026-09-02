import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Market Impact",
    short_name: "Impact",
    description: "Detect high-impact US equity news and SEC filings.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a2b48",
    theme_color: "#1a2b48",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
