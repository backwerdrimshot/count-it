import type { MetadataRoute } from "next";

const productionUrl = "https://count-it.backwerdrhythmshop.com/";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: productionUrl,
      lastModified: new Date("2026-08-02"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
