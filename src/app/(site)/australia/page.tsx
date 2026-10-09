import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowSquareOut,
  Briefcase,
  HeartStraight,
  ShieldCheck,
  UsersThree,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { SectionHeading } from "@/components/SectionHeading";
import { JsonLd } from "@/components/JsonLd";
import {
  AnimatedSection,
  Stagger,
  StaggerItem,
} from "@/components/AnimatedSection";
import { buildRegionServiceSchema } from "@/lib/schema";
import { pageOpenGraph } from "@/lib/seo";
import { companyInfo } from "@/lib/data";

const DESCRIPTION =
  "Australian visa advice from a registered migration agent (MARN 2217960): partner, skilled, employer-sponsored, student and visitor visas.";

export const metadata: Metadata = {
  title: "Australian Visa Advice — Registered Migration Agent",
  description: DESCRIPTION,
  openGraph: pageOpenGraph(
    "Australian Visa Advice | PPIM Consulting",
    DESCRIPTION,
    "/australia"
  ),
};

const audiences = [
  {
    icon: UsersThree,
    title: "New Zealanders in Australia",
    text: "Already living in Australia on a Special Category visa and thinking about permanent residence or citizenship? We'll map out which route applies to you — and tell you plainly if you don't need a visa at all.",
  },
  {
    icon: HeartStraight,
    title: "Fijian and Pacific families",
    text: "Partner and family applications need strong, well-organised evidence. With offices in Nadi and Suva, we help you prepare it properly before anything is lodged.",
  },
  {
    icon: Briefcase,
    title: "Skilled workers and students",
    text: "From skilled and employer-sponsored visas to study in Australia, we assess your options and manage the application end to end.",
  },
];

const visaTypes = [
  {
    name: "Partner visas",
    subclass: "Subclasses 820/801 (in Australia) and 309/100 (outside Australia)",
    text: "For partners and spouses of Australian citizens, permanent residents and eligible New Zealand citizens.",
  },
  {
    name: "Skilled visas",
    subclass: "Subclasses 189, 190 and 491",
    text: "Points-tested visas for skilled workers, independent or nominated by a state, territory or regional area.",
  },
  {
    name: "Employer-sponsored visas",
    subclass: "Subclasses 482 and 186",
    text: "Temporary and permanent visas where an Australian employer sponsors or nominates you for a role.",
  },
  {
    name: "Student visas",
    subclass: "Subclass 500",
    text: "For full-time study with a registered Australian education provider.",
  },
  {
    name: "Visitor visas",
    subclass: "Subclass 600",
    text: "For holidays, family visits and short business trips to Australia.",
  },
  {
    name: "New Zealand citizens",
    subclass: "Subclass 444 (Special Category visa)",
    text: "Advice on residence and citizenship options for New Zealanders who live in Australia.",
  },
];

export default function AustraliaPage() {
  return (
    <>
      <JsonLd
        data={buildRegionServiceSchema({
          path: "/australia",
          name: "Australian visa assistance",
          description: DESCRIPTION,
          country: "Australia",
        })}
      />
      <PageHero
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Australian visas", path: "/australia" },
        ]}
        eyebrow="Australia"
        title="Australian visa advice from a registered migration agent"
        intro="Priya Pratap is a Registered Migration Agent (MARN 2217960) as well as a licensed New Zealand immigration adviser — so whether your future is in Australia, New Zealand, or a choice between the two, you get advice from one accountable professional."
      >
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Button href="/book-consultation" size="lg">
            Book a Free Consultation
          </Button>
          <a
            href={companyInfo.maraRegisterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-5 py-3 text-sm font-medium text-gold-300 transition-colors hover:border-gold-400/60"
          >
            <ShieldCheck size={18} weight="fill" />
            Check MARN 2217960 on the MARA register
            <ArrowSquareOut size={14} weight="bold" />
          </a>
        </div>
      </PageHero>

      <section className="py-24 md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Who we help"
              title="Australian visa advice for three kinds of clients"
            />
          </AnimatedSection>
          <Stagger className="mt-14 grid gap-6 md:grid-cols-3">
            {audiences.map((a) => (
              <StaggerItem
                key={a.title}
                className="rounded-card border border-navy-900/10 bg-white/70 p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                  <a.icon size={24} weight="duotone" />
                </div>
                <h3 className="mt-5 font-display text-xl text-navy-900">
                  {a.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-700/80">
                  {a.text}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="bg-cream-100/60 py-24 md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Visa types"
              title="Australian visas we advise on"
              description="Each visa has its own eligibility rules, government charges and processing times, set by the Department of Home Affairs."
            />
          </AnimatedSection>
          <Stagger className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-2">
            {visaTypes.map((v) => (
              <StaggerItem
                key={v.name}
                className="rounded-2xl border border-navy-900/10 bg-white/80 px-6 py-5"
              >
                <h3 className="font-display text-lg text-navy-900">{v.name}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gold-600">
                  {v.subclass}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-navy-700/80">
                  {v.text}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-page grid gap-16 lg:grid-cols-2">
          <AnimatedSection>
            <h2 className="font-display text-3xl text-navy-900">
              New Zealanders living in Australia
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed text-navy-700/80">
              <p>
                Most New Zealand citizens are granted a Special Category visa
                (subclass 444) when they arrive in Australia, which lets them
                live and work there. It is a temporary visa, so many
                New Zealanders later look at permanent residence or
                Australian citizenship.
              </p>
              <p>
                Since 1 July 2023, many New Zealand citizens who have lived
                in Australia for at least four years can apply for Australian
                citizenship directly, without first getting a permanent visa.
                Eligibility depends on your own history, so check the current
                rules with the Department of Home Affairs — or ask us to
                check them for you.
              </p>
              <p>
                A good adviser will tell you when you don&apos;t need a visa
                application at all. That&apos;s exactly what we do.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <h2 className="font-display text-3xl text-navy-900">
              How we work with Australian clients
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                "Consultations by video call or phone, or in person at our Auckland office. We do not have an Australian office.",
                "A free initial consultation to assess your options before you commit to anything.",
                "A written client agreement setting out the work and our fees before any paid work begins. Home Affairs charges, medicals and police checks are separate.",
                "Priya's MARN covers Australian visa assistance; her IAA licence covers New Zealand immigration advice.",
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 rounded-2xl border border-navy-900/10 bg-white/70 px-5 py-4 text-sm leading-relaxed text-navy-800"
                >
                  <ShieldCheck size={18} weight="fill" className="mt-0.5 shrink-0 text-fern-500" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-navy-700/80">
              Official information on every Australian visa is published by
              the Department of Home Affairs at{" "}
              <a
                href="https://immi.homeaffairs.gov.au/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-600 underline underline-offset-2"
              >
                immi.homeaffairs.gov.au
              </a>
              . This page is general information, not advice for your
              situation.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="bg-navy-900 py-20 text-center text-cream">
        <div className="container-page">
          <AnimatedSection>
            <h2 className="font-display text-3xl md:text-4xl">
              Weighing up Australia or New Zealand?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/70">
              Talk it through with an adviser licensed in both. We&apos;ll
              compare your options honestly — including{" "}
              <Link href="/services" className="text-gold-400 underline underline-offset-2">
                New Zealand visa pathways
              </Link>{" "}
              and support for{" "}
              <Link href="/fiji" className="text-gold-400 underline underline-offset-2">
                clients in Fiji
              </Link>
              .
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button href="/book-consultation" size="lg">
                Book a Free Consultation
              </Button>
              <Button
                href={companyInfo.whatsapp}
                external
                variant="ghostLight"
                size="lg"
              >
                <WhatsappLogo size={18} weight="fill" />
                Message us on WhatsApp
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
