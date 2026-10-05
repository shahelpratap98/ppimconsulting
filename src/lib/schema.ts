import { companyInfo, services as visaServices, team } from "@/lib/data";

export const SITE_URL = "https://www.ppimconsulting.co.nz";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const ADVISER_ID = `${SITE_URL}/about#priya-pratap`;

const AREA_SERVED = [
  { "@type": "Country", name: "New Zealand" },
  { "@type": "Country", name: "Fiji" },
  { "@type": "Country", name: "Australia" },
];

/** Sitewide entity. Injected once, in the root layout, so it appears on every page. */
export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORGANIZATION_ID,
    name: companyInfo.name,
    alternateName: companyInfo.fullName,
    description:
      "Licensed immigration advisory practice in Auckland, New Zealand, with offices in Nadi and Suva, Fiji, advising on New Zealand and Australian visas.",
    url: `${SITE_URL}/`,
    telephone: companyInfo.phone.replace(/\s/g, ""),
    email: companyInfo.email,
    // No dedicated logo asset exists yet — using the real adviser photo as a
    // stopgap `image`. Add a square logo file and a `logo` field once it exists.
    // postalCode and geo are left out until confirmed with NZ Post / Google Maps.
    image: `${SITE_URL}/priya-pratap.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "155 Smales Road",
      addressLocality: "East Tāmaki",
      addressRegion: "Auckland",
      addressCountry: "NZ",
    },
    hasMap: companyInfo.mapUrl,
    location: [
      {
        "@type": "Place",
        name: "PPIM Consulting — Nadi",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Nadi",
          addressCountry: "FJ",
        },
      },
      {
        "@type": "Place",
        name: "PPIM Consulting — Suva",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Suva",
          addressCountry: "FJ",
        },
      },
    ],
    areaServed: AREA_SERVED,
    knowsAbout: [
      "New Zealand immigration",
      "Australian visas",
      "Skilled Migrant Category",
      "Partnership visas",
      "Student visas",
    ],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "17:30",
    },
    sameAs: [companyInfo.facebook],
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
    telephone: companyInfo.phone.replace(/\s/g, ""),
    sameAs: [companyInfo.facebook],
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
    areaServed: AREA_SERVED,
    category: "Immigration Visa Services",
  };
}

/** Service entity for a standalone landing page such as /australia or /fiji. */
export function buildRegionServiceSchema({
  path,
  name,
  description,
  country,
}: {
  path: string;
  name: string;
  description: string;
  country: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}${path}#service`,
    serviceType: name,
    name,
    description,
    url: `${SITE_URL}${path}`,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: country },
    category: "Immigration Visa Services",
  };
}

/** Site entity, injected on the home page to support Google's site name. */
export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: companyInfo.name,
    alternateName: companyInfo.fullName,
    url: `${SITE_URL}/`,
    publisher: { "@id": ORGANIZATION_ID },
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
