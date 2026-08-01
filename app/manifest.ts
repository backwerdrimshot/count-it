import type { MetadataRoute } from "next";

/* SVG icon only: no PNG icons yet, so iOS falls back to a screenshot on Add to
   Home Screen. Generating them needs a rasteriser; add PNGs here when one is
   to hand. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Count It — Backwerd Rhythm Shop",
    short_name: "Count It",
    description: "Practice reading quarter-note, eighth-note, and sixteenth-note rhythms with clear counting feedback.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffdf9",
    theme_color: "#003366",
    icons: [{ src: "/favicon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" }],
  };
}
