import type { MetadataRoute } from "next";

const productionUrl = "https://count-it.backwerdrhythmshop.com/";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${productionUrl}workshop`, lastModified: new Date("2026-10-08"), changeFrequency: "monthly", priority: 0.6 },
    {
      url: productionUrl,
      lastModified: new Date("2026-10-08"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${productionUrl}build`,
      lastModified: new Date("2026-10-04"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${productionUrl}assignments`,
      lastModified: new Date("2026-10-04"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${productionUrl}notation`,
      lastModified: new Date("2026-10-04"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
