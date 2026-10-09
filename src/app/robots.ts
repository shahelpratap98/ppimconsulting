import type { MetadataRoute } from "next";

const BASE_URL = "https://www.ppimconsulting.co.nz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/portal",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
