import type { MetadataRoute } from "next";

/* The SVG stays first for browsers that prefer it; the PNGs are what iOS and
   Android actually use for a home-screen tile. Both symbols sit inside the
   set's 716px safe circle, so "maskable" is a claim this can keep. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Count It — Backwerd Rhythm Shop",
    short_name: "Count It",
    description: "Practice reading quarter-note, eighth-note, and sixteenth-note rhythms with clear counting feedback.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#171717",
    icons: [
      { src: "/favicon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}
