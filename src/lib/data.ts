import type { Icon } from "@phosphor-icons/react";
import {
  Airplane,
  Briefcase,
  Buildings,
  GraduationCap,
  HeartStraight,
  SuitcaseRolling,
} from "@phosphor-icons/react/dist/ssr";

export type VisaService = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  icon: Icon;
  summary: string;
  heroPoints: string[];
  eligibility: string[];
  process: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
};

export const services: VisaService[] = [
  {
    slug: "skilled-migrant-visa",
    name: "Skilled Migrant Category Resident Visa",
    shortName: "Skilled Migrant",
    tagline: "Turn your career into permanent residence in New Zealand.",
    icon: Briefcase,
    summary:
      "For skilled professionals ready to make Aotearoa home. We assess your points, build your Expression of Interest, and manage your application through to residence.",
    heroPoints: [
      "Points assessment & EOI strategy",
      "Occupation registration guidance",
      "End-to-end application management",
    ],
    eligibility: [
      "Meet the points threshold under Immigration New Zealand's system",
      "Skilled employment in New Zealand, or a qualifying job offer",
      "Health and character requirements met",
      "English language ability at the required standard",
    ],
    process: [
      { title: "Free initial assessment", description: "We review your qualifications, work history, and points to confirm your pathway." },
      { title: "Expression of Interest", description: "We prepare and submit a compelling EOI that reflects your true strength as a candidate." },
      { title: "Invitation to Apply", description: "Once selected, we build your full residence application with supporting evidence." },
      { title: "Decision & residence", description: "We manage correspondence with INZ until your residence is confirmed." },
    ],
    faqs: [
      {
        question: "How many points do I need?",
        answer:
          "Requirements are reviewed regularly by Immigration New Zealand. In your free assessment we calculate your current points and flag ways to strengthen your position.",
      },
      {
        question: "Can my family be included?",
        answer:
          "Yes — partners and dependent children can generally be included in the same application, subject to standard requirements.",
      },
    ],
  },
  {
    slug: "work-visa",
    name: "Accredited Employer Work Visa",
    shortName: "Work Visa",
    tagline: "Get to work in New Zealand with confidence.",
    icon: Airplane,
    summary:
      "Whether you have a job offer in hand or need help finding an accredited employer, we guide you through the AEWV process from job check to visa grant.",
    heroPoints: [
      "Employer accreditation checks",
      "Job token & job check support",
      "Visa application & compliance review",
    ],
    eligibility: [
      "A genuine job offer from an accredited New Zealand employer",
      "The role meets wage and market rate requirements",
      "You meet health, character and qualification requirements",
      "Employer has completed the job check where required",
    ],
    process: [
      { title: "Offer & employer review", description: "We confirm your employer holds accreditation and the role qualifies." },
      { title: "Job check coordination", description: "We liaise with your employer to complete the job check application." },
      { title: "Visa application", description: "We prepare your work visa application with full supporting documentation." },
      { title: "Approval & onboarding", description: "We help you understand conditions, validity and next steps toward residence." },
    ],
    faqs: [
      {
        question: "My employer isn't accredited yet — can you help?",
        answer:
          "Yes, we can guide your employer through the accreditation process alongside your own application.",
      },
      {
        question: "Can a work visa lead to residence?",
        answer:
          "Many work visa holders become eligible for the Skilled Migrant Category or sector-specific residence pathways — we plan for this from day one.",
      },
    ],
  },
  {
    slug: "student-visa",
    name: "Student Visa",
    shortName: "Student Visa",
    tagline: "Start your New Zealand education journey the right way.",
    icon: GraduationCap,
    summary:
      "From offer letter to enrolment, we make sure your student visa application is complete, correctly evidenced, and submitted on time.",
    heroPoints: [
      "Offer of place & funds evidence",
      "Pathway planning to work or residence",
      "Dependent visa coordination",
    ],
    eligibility: [
      "An offer of place from a licensed New Zealand education provider",
      "Sufficient funds for tuition and living costs",
      "Genuine intention to study, health and character requirements met",
    ],
    process: [
      { title: "Course & provider check", description: "We confirm your offer and provider meet Immigration New Zealand requirements." },
      { title: "Evidence preparation", description: "We help you gather funds, accommodation and travel evidence." },
      { title: "Application & lodgement", description: "We submit your complete application and monitor its progress." },
      { title: "Visa grant & arrival prep", description: "We brief you on conditions, work rights and arrival requirements." },
    ],
    faqs: [
      {
        question: "Can I work while studying?",
        answer:
          "Many student visas include part-time work rights during term and full-time during scheduled breaks — we confirm your specific conditions.",
      },
      {
        question: "Can my family join me?",
        answer:
          "Depending on your study level, partners and children may be eligible for a visa to accompany you — we assess this in your consultation.",
      },
    ],
  },
  {
    slug: "visitor-visa",
    name: "Visitor Visa",
    shortName: "Visitor Visa",
    tagline: "Visit New Zealand for a holiday, family or a look before you leap.",
    icon: SuitcaseRolling,
    summary:
      "Whether you're visiting family, exploring New Zealand, or scoping out a future move, we make sure your visitor visa application is complete, credible and lodged right the first time.",
    heroPoints: [
      "Genuine intent & ties evidence",
      "Funds and sponsorship guidance",
      "Family visit & multiple-entry support",
    ],
    eligibility: [
      "A genuine intention to visit New Zealand temporarily",
      "Sufficient funds for your stay, or an approved sponsor",
      "Onward or return travel arrangements",
      "Health and character requirements met",
    ],
    process: [
      { title: "Free initial assessment", description: "We review your travel purpose, ties to home and funds to confirm the right visitor pathway." },
      { title: "Evidence preparation", description: "We help you gather funds, sponsorship, accommodation and travel evidence that stands up to scrutiny." },
      { title: "Application & lodgement", description: "We lodge your complete application and respond to any requests from Immigration New Zealand." },
      { title: "Visa grant & travel", description: "We confirm your visa conditions, allowed stay and any multiple-entry provisions before you fly." },
    ],
    faqs: [
      {
        question: "How long can I stay on a visitor visa?",
        answer:
          "Most visitors can stay up to several months at a time, with overall limits over an 18-month period. We confirm the current allowances for your situation in your consultation.",
      },
      {
        question: "Can family in New Zealand sponsor my visit?",
        answer:
          "Yes — a New Zealand citizen or resident family member can often act as a sponsor, covering accommodation or funds requirements. We prepare the sponsorship forms with them.",
      },
      {
        question: "Can I switch to a work or student visa while visiting?",
        answer:
          "In many cases you can apply for a different visa from within New Zealand. We plan this pathway with you before you arrive so nothing is left to chance.",
      },
    ],
  },
  {
    slug: "partner-family-visa",
    name: "Partner & Family Visa",
    shortName: "Partner & Family",
    tagline: "Bring the people you love to New Zealand.",
    icon: HeartStraight,
    summary:
      "Partnership and family visas require careful evidence of a genuine relationship. We build your case with the sensitivity and rigour it deserves.",
    heroPoints: [
      "Genuine relationship evidence strategy",
      "Parent & dependent child pathways",
      "Support through interviews & RFI requests",
    ],
    eligibility: [
      "A genuine and stable partnership (12+ months for partnership visas)",
      "Sponsor is a New Zealand citizen or resident",
      "Health and character requirements met by all applicants",
    ],
    process: [
      { title: "Relationship review", description: "We assess your evidence and identify any gaps before we begin." },
      { title: "Evidence & statements", description: "We help you compile a clear, credible evidence package." },
      { title: "Application management", description: "We lodge your application and respond to any requests for information." },
      { title: "Visa decision", description: "We guide you through to a decision, including interview preparation if required." },
    ],
    faqs: [
      {
        question: "We haven't lived together 12 months — can we still apply?",
        answer:
          "There are pathways for shorter relationships in specific circumstances. We'll assess your situation in a confidential consultation.",
      },
      {
        question: "Can parents be sponsored for residence?",
        answer:
          "Parent categories open periodically with specific income and sponsorship requirements — we track openings and prepare your case in advance.",
      },
    ],
  },
  {
    slug: "business-investor-visa",
    name: "Business & Investor Visa",
    shortName: "Business & Investor",
    tagline: "Invest in — or build — your future in New Zealand.",
    icon: Buildings,
    summary:
      "For entrepreneurs and investors, we structure your application around Immigration New Zealand's business and investment categories with a clear plan for growth.",
    heroPoints: [
      "Investment structuring guidance",
      "Business plan & source-of-funds support",
      "Entrepreneur work-to-residence pathway",
    ],
    eligibility: [
      "Meet minimum investment funds thresholds for your chosen category",
      "A genuine, credible business or investment plan",
      "Health, character and (for entrepreneurs) business experience requirements",
    ],
    process: [
      { title: "Strategy session", description: "We map your investment or business idea against current visa categories." },
      { title: "Plan & funds evidence", description: "We help prepare your business plan and source-of-funds documentation." },
      { title: "Application & approval", description: "We lodge your application and liaise with INZ through to a decision." },
      { title: "Growth to residence", description: "We plan your pathway from visa grant through to residence milestones." },
    ],
    faqs: [
      {
        question: "What's the minimum investment amount?",
        answer:
          "Thresholds vary by category and are reviewed periodically by Immigration New Zealand. We confirm current figures in your consultation.",
      },
      {
        question: "Can I bring my business team with me?",
        answer:
          "Key staff transfers are possible under certain categories — we'll assess whether this applies to your business structure.",
      },
    ],
  },
];

export const testimonials = [
  {
    name: "Priya R.",
    origin: "India → Auckland",
    quote:
      "PPIM Consulting handled our Skilled Migrant application with total transparency. We always knew exactly where we stood.",
  },
  {
    name: "Daniel & Sofia M.",
    origin: "Brazil → Hamilton",
    quote:
      "Our partnership visa felt daunting until we sat down with the team. They made the evidence process feel manageable and human.",
  },
  {
    name: "Wei C.",
    origin: "China → Auckland",
    quote:
      "Clear communication at every step of our work visa and, later, our residence application. Couldn't recommend them more.",
  },
];

export const stats = [
  { value: 8000, suffix: "+", label: "Visas successfully lodged" },
  { value: 98, suffix: "%", label: "Client satisfaction rating" },
  { value: 15, suffix: "+", label: "Years of experience — since 2011" },
  { value: 30, suffix: "+", label: "Countries of origin represented" },
];

export const team = [
  {
    name: "Priya Pratap",
    role: "Founder & Licensed Immigration Adviser",
    license: "IAA License No. 201100160",
    licenseAu: "Registered Migration Agent, Australia — MARN 2217960",
    bio: "Priya leads every case personally — from skilled migrant and work visas to partnership and family applications — serving clients across New Zealand, Australia and Fiji.",
  },
];

export const navLinks = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
];

export const companyInfo = {
  name: "PPIM Consulting",
  fullName: "Priya Pratap Immigration Consulting",
  legalLine:
    "Priya Pratap Immigration Consulting (PPIM Consulting) is licensed by the Immigration Advisers Authority (IAA License No. 201100160) and is a Registered Migration Agent in Australia (MARN 2217960).",
  license: "IAA License No. 201100160",
  licenseAu: "Registered Migration Agent, Australia — MARN 2217960",
  address: "155 Smales Road, East Tāmaki, Auckland, New Zealand",
  fijiOffices: "Fiji offices in Nadi and Suva",
  phone: "+64 21 120 8592",
  email: "priya_pratap@ppimconsulting.co.nz",
  enquiriesEmail: "info@ppimconsulting.co.nz",
  whatsapp: "https://wa.me/64211208592",
  hours: "Mon–Fri, 9:00am–5:30pm NZST",
};
