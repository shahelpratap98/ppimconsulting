// Starting document checklists for new cases. The NZ lists come from the
// "PPIM case assistant" prototype; they are a starting point only. Requirements
// change, so check each list against current Immigration New Zealand / Home
// Affairs guidance and edit items on the case as needed.

export type Pathway = {
  key: string;
  name: string;
  short: string;
  jurisdiction: "NZ" | "AU";
  items: string[];
};

export const PATHWAYS: Pathway[] = [
  {
    key: "smc",
    name: "Skilled Migrant Category (Residence)",
    short: "SMC",
    jurisdiction: "NZ",
    items: [
      "Passport — JP-certified copy of bio page (valid 3+ months past intended stay)",
      "Police certificates — every country lived in 12+ months (last 10 years), issued within 6 months",
      "Medical certificate + chest X-ray (eMedical, within 3 months)",
      "English test result — IELTS 6.5+ or equivalent, within 2 years",
      "Skilled employment evidence — job offer / employment agreement with accredited employer",
      "Qualification documents (+ NZQA IQA assessment if not on exemption list)",
      "Work experience evidence — references, payslips, contracts",
      "Birth certificate or identity documents",
    ],
  },
  {
    key: "partnership",
    name: "Partnership-Based Visa",
    short: "Partnership",
    jurisdiction: "NZ",
    items: [
      "Applicant passport — JP-certified copy of bio page",
      "Partner's NZ status — citizenship / residence evidence",
      "Evidence of living together — joint tenancy, mortgage or mail at same address",
      "Shared finances — joint bank statements, shared bills",
      "Relationship evidence — photos over time, messages, travel together",
      "Partnership support form (INZ 1146) signed by partner",
      "Police certificates (countries lived in 12+ months, last 10 years)",
      "Medical certificate / chest X-ray (if required, within 3 months)",
    ],
  },
  {
    key: "aewv",
    name: "Accredited Employer Work Visa",
    short: "AEWV",
    jurisdiction: "NZ",
    items: [
      "Passport — JP-certified copy of bio page",
      "Job token from accredited employer (approved Job Check)",
      "Employment agreement matching the Job Check",
      "Qualifications / experience evidence matching role requirements",
      "Occupational registration (if the role requires it)",
      "Police certificates (if staying 24+ months)",
      "Medical / chest X-ray (if required for stay length or country)",
    ],
  },
  {
    key: "student",
    name: "Fee Paying Student Visa",
    short: "Student",
    jurisdiction: "NZ",
    items: [
      "Passport — JP-certified copy of bio page",
      "Offer of place from an approved education provider",
      "Tuition fee receipt or evidence fees will be paid",
      "Evidence of living funds (NZD $20,000+/yr or FTS)",
      "Medical certificate / chest X-ray (stays over 6/12 months)",
      "Police certificate (17+ and staying 24+ months)",
      "Evidence of onward plans / intent to meet visa conditions",
    ],
  },
  {
    key: "visitor",
    name: "Visitor Visa",
    short: "Visitor",
    jurisdiction: "NZ",
    items: [
      "Passport — JP-certified copy of bio page (valid 3+ months beyond departure)",
      "Evidence of funds — NZD $1,000/month of stay (or $400 if accommodation prepaid)",
      "Onward travel ticket or evidence of funds to buy one",
      "Purpose of visit evidence — itinerary, invitation, bookings",
      "Sponsorship form (INZ 1025) if sponsored",
      "Chest X-ray if from a high-TB-incidence country and staying 6+ months",
    ],
  },
  {
    key: "business",
    name: "Business & Investor Visa",
    short: "Business",
    jurisdiction: "NZ",
    items: [
      "Passport — certified copy of bio page",
      "Business plan or investment proposal",
      "Source of funds evidence",
      "Business experience evidence",
      "Police certificates",
      "Medical certificates (if required)",
    ],
  },
  {
    key: "au-partner",
    name: "Australian Partner Visa (820/801 or 309/100)",
    short: "AU Partner",
    jurisdiction: "AU",
    items: [
      "Applicant passport — certified copy of bio page",
      "Sponsor's Australian citizenship / permanent residence / eligible NZ citizen evidence",
      "Relationship evidence — financial, household, social and commitment",
      "Statements from applicant and sponsor about the relationship",
      "Police certificates",
      "Health examinations (when requested by Home Affairs)",
    ],
  },
  {
    key: "au-visitor",
    name: "Australian Visitor Visa (600)",
    short: "AU Visitor",
    jurisdiction: "AU",
    items: [
      "Passport — certified copy of bio page",
      "Evidence of funds for the stay",
      "Purpose of visit — itinerary, invitation, bookings",
      "Evidence of ties to home country (employment, family, property)",
    ],
  },
  {
    key: "au-student",
    name: "Australian Student Visa (500)",
    short: "AU Student",
    jurisdiction: "AU",
    items: [
      "Passport — certified copy of bio page",
      "Confirmation of Enrolment (CoE)",
      "Evidence of funds",
      "English language test result (if required)",
      "Overseas Student Health Cover (OSHC)",
      "Genuine student statement",
    ],
  },
  {
    key: "au-skilled",
    name: "Australian Skilled / Employer-Sponsored Visa",
    short: "AU Skilled",
    jurisdiction: "AU",
    items: [
      "Passport — certified copy of bio page",
      "Skills assessment",
      "English language test result",
      "Employment references and payslips",
      "Nomination or state sponsorship evidence (if applicable)",
      "Police certificates",
      "Health examinations (when requested)",
    ],
  },
  {
    key: "other",
    name: "Other (build the checklist yourself)",
    short: "Other",
    jurisdiction: "NZ",
    items: [],
  },
];

export const pathwayByKey = (key: string) => PATHWAYS.find((p) => p.key === key);
export const pathwayLabel = (key: string) => (key === "internal" ? "Internal" : pathwayByKey(key)?.short ?? key);
