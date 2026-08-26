import type { MetadataRoute } from "next";
import { services } from "@/lib/data";

const BASE_URL = "https://www.ppimconsulting.co.nz";

// Real "last significant change" dates, taken from git history for the
// content driving each route. Update these when you materially change a
// page's content (copy, structure, pricing, etc.) — not on every deploy.
const LAST_MODIFIED = {
  home: new Date("2026-07-12"),
  about: new Date("2026-08-26"),
  servicesIndex: new Date("2026-07-12"),
  // All service detail pages are rendered from `services` in src/lib/data.ts,
  // so a single date covers them until per-service tracking is needed.
  servicesDetail: new Date("2026-08-26"),
  bookConsultation: new Date("2026-07-12"),
  contact: new Date("2026-07-12"),
};

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: LAST_MODIFIED.home,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: LAST_MODIFIED.about,
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: LAST_MODIFIED.servicesIndex,
    },
    {
      url: `${BASE_URL}/book-consultation`,
      lastModified: LAST_MODIFIED.bookConsultation,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: LAST_MODIFIED.contact,
    },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${BASE_URL}/services/${service.slug}`,
    lastModified: LAST_MODIFIED.servicesDetail,
  }));

  return [...staticRoutes, ...serviceRoutes];
}
