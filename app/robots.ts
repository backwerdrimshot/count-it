import type { MetadataRoute } from "next";

const productionUrl = "https://count-it.backwerdrhythmshop.com/";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${productionUrl}sitemap.xml`,
  };
}
