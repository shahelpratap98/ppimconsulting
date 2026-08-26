import { companyInfo, services as visaServices, team } from "@/lib/data";

export const SITE_URL = "https://www.ppimconsulting.co.nz";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const ADVISER_ID = `${SITE_URL}/about#priya-pratap`;

/** Sitewide entity. Injected once, in the root layout, so it appears on every page. */
export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORGANIZATION_ID,
    name: companyInfo.name,
    alternateName: companyInfo.fullName,
    description:
      "Licensed immigration advisory practice in Auckland, New Zealand, with offices in Nadi and Suva, Fiji, providing Skilled Migrant, Work, Student, Visitor, Partner & Family, and Business & Investor visa advice.",
    url: `${SITE_URL}/`,
    telephone: companyInfo.phone,
    email: companyInfo.enquiriesEmail,
    // No dedicated logo asset exists yet — using the real adviser photo as a
    // stopgap `image`. Add a square logo file and a `logo` field once it exists.
    image: `${SITE_URL}/priya-pratap.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "155 Smales Road",
      addressLocality: "East Tāmaki",
      addressRegion: "Auckland",
      addressCountry: "NZ",
    },
    areaServed: [
      { "@type": "Country", name: "New Zealand" },
      { "@type": "Country", name: "Fiji" },
      { "@type": "Country", name: "Australia" },
    ],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "17:30",
    },
    sameAs: ["https://www.facebook.com/profile.php?id=100027702354126"],
    founder: { "@id": ADVISER_ID },
    employee: { "@id": ADVISER_ID },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Visa Advisory Services",
      itemListElement: visaServices.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          "@id": `${SITE_URL}/services/${service.slug}#service`,
          name: service.name,
          url: `${SITE_URL}/services/${service.slug}`,
        },
      })),
    },
  };
}

/** Adviser profile. Injected on /about. */
export function buildPersonSchema() {
  const adviser = team[0];
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": ADVISER_ID,
    name: adviser.name,
    jobTitle: adviser.role,
    description: adviser.bio,
    image: `${SITE_URL}/priya-pratap.jpg`,
    url: `${SITE_URL}/about`,
    email: companyInfo.email,
    telephone: companyInfo.phone,
    worksFor: { "@id": ORGANIZATION_ID },
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "license",
        name: "Immigration Advisers Authority (IAA) License",
        identifier: "201100160",
        recognizedBy: {
          "@type": "Organization",
          name: "Immigration Advisers Authority (New Zealand)",
          url: "https://www.iaa.govt.nz/",
        },
      },
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "license",
        name: "Registered Migration Agent (Australia)",
        identifier: "MARN 2217960",
        recognizedBy: {
          "@type": "Organization",
          name: "Office of the Migration Agents Registration Authority (MARA)",
          url: "https://www.mara.gov.au/",
        },
      },
    ],
  };
}

/** Per-visa Service entity. Injected on each /services/[slug] page. */
export function buildServiceSchema(slug: string) {
  const service = visaServices.find((s) => s.slug === slug);
  if (!service) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/services/${service.slug}#service`,
    serviceType: service.name,
    name: service.name,
    description: service.summary,
    url: `${SITE_URL}/services/${service.slug}`,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: "New Zealand" },
    category: "Immigration Visa Services",
  };
}

export type Crumb = { name: string; path: string };

/** Reusable breadcrumb builder. Injected on any non-home page. */
export function buildBreadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}
