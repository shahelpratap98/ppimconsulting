import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  FileText,
  MapPin,
  VideoCamera,
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
import { companyInfo, services } from "@/lib/data";

const DESCRIPTION =
  "Licensed immigration advice for clients in Fiji, with offices in Nadi and Suva — NZ and Australian visitor, study, work, partner and residence visas.";

export const metadata: Metadata = {
  title: "Immigration Adviser in Fiji — Nadi & Suva",
  description: DESCRIPTION,
  openGraph: pageOpenGraph(
    "Immigration Adviser in Fiji — Nadi & Suva | PPIM Consulting",
    DESCRIPTION,
    "/fiji"
  ),
};

const preparation = [
  "A passport that stays valid for the length of your planned stay",
  "Police certificates, where the visa requires a character check",
  "Medical and chest X-ray certificates from an approved panel physician, where required",
  "Birth, marriage and relationship evidence for partner and family visas",
  "Bank statements or sponsorship forms showing how your stay is funded",
  "Qualification and work-history documents for study, work and skilled visas",
];

const ways = [
  {
    icon: MapPin,
    title: "In person in Nadi or Suva",
    text: "Appointments at our Fiji offices are arranged in advance — message or call us to book a time.",
  },
  {
    icon: VideoCamera,
    title: "By video or phone",
    text: "Meet your adviser online from anywhere in Fiji, at a time that suits you.",
  },
  {
    icon: WhatsappLogo,
    title: "On WhatsApp",
    text: "Send a quick message with your question and we'll come back to you within one business day.",
  },
];

export default function FijiPage() {
  return (
    <>
      <JsonLd
        data={buildRegionServiceSchema({
          path: "/fiji",
          name: "Immigration advice for clients in Fiji",
          description: DESCRIPTION,
          country: "Fiji",
        })}
      />
      <PageHero
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Fiji offices", path: "/fiji" },
        ]}
        eyebrow="Fiji — Nadi & Suva"
        title="Immigration advice in Fiji, from an adviser licensed in New Zealand and Australia"
        intro="Many of our clients start their journey in Fiji. From our offices in Nadi and Suva, Priya Pratap (IAA licence 201100160, MARN 2217960) helps Fijian families, students and workers prepare strong New Zealand and Australian visa applications — close to home."
      >
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Button href={companyInfo.whatsapp} external size="lg">
            <WhatsappLogo size={20} weight="fill" />
            Message us on WhatsApp
          </Button>
          <Button
            href="/book-consultation"
            variant="ghostLight"
            size="lg"
          >
            Book a free consultation
          </Button>
        </div>
      </PageHero>

      <section className="py-24 md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="From Fiji to New Zealand"
              title="New Zealand visa pathways for Fijian citizens"
              description="Whether you're visiting family, studying, taking up a job or planning to settle, each pathway starts with an honest assessment of your situation."
            />
          </AnimatedSection>
          <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <StaggerItem key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-navy-900/10 bg-white/70 p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <s.icon size={24} weight="duotone" className="text-gold-600" />
                  <h3 className="mt-3 font-display text-lg text-navy-900">
                    {s.shortName}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-700/80">
                    {s.tagline}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-600 transition-all group-hover:gap-1.5">
                    View pathway <ArrowRight size={14} weight="bold" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
          <p className="mt-8 text-center text-navy-700/80">
            Thinking about Australia instead?{" "}
            <Link href="/australia" className="text-gold-600 underline underline-offset-2">
              See our Australian visa advice
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-cream-100/60 py-24 md:py-32">
        <div className="container-page grid gap-16 lg:grid-cols-2">
          <AnimatedSection>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-600">
              Getting ready
            </span>
            <h2 className="mt-3 font-display text-3xl text-navy-900">
              Documents Fijian applicants often need
            </h2>
            <p className="mt-4 leading-relaxed text-navy-700/80">
              Gathering documents in Fiji can take weeks, so it pays to start
              early. Depending on the visa, you may be asked for:
            </p>
            <ul className="mt-6 space-y-3">
              {preparation.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-navy-900/10 bg-white/80 px-5 py-4 text-sm leading-relaxed text-navy-800"
                >
                  <FileText size={18} weight="duotone" className="mt-0.5 shrink-0 text-gold-600" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-navy-700/80">
              The exact list depends on your visa and your circumstances. The
              current requirements are published by{" "}
              <a
                href="https://www.immigration.govt.nz/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-600 underline underline-offset-2"
              >
                Immigration New Zealand
              </a>{" "}
              and the{" "}
              <a
                href="https://immi.homeaffairs.gov.au/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-600 underline underline-offset-2"
              >
                Australian Department of Home Affairs
              </a>
              , and your adviser confirms them for your case.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-600">
              Meet your adviser
            </span>
            <h2 className="mt-3 font-display text-3xl text-navy-900">
              Three ways to talk to us from Fiji
            </h2>
            <div className="mt-6 space-y-4">
              {ways.map((w) => (
                <div
                  key={w.title}
                  className="flex items-start gap-4 rounded-2xl border border-navy-900/10 bg-white/80 p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                    <w.icon size={20} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-sans text-base font-medium text-navy-900">
                      {w.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-700/80">
                      {w.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-fern-500/20 bg-fern-50 p-5">
              <CalendarCheck size={20} weight="duotone" className="mt-0.5 shrink-0 text-fern-700" />
              <p className="text-sm leading-relaxed text-fern-700">
                Your first consultation is free. If you go ahead, you&apos;ll
                receive a written client agreement setting out the work and
                our fees before anything is charged.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="bg-navy-900 py-20 text-center text-cream">
        <div className="container-page">
          <AnimatedSection>
            <h2 className="font-display text-3xl md:text-4xl">
              Start your application the right way
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/70">
              Talk to a licensed adviser before you lodge — it&apos;s the best
              way to avoid delays and refusals.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button href={companyInfo.whatsapp} external size="lg">
                <WhatsappLogo size={20} weight="fill" />
                Message us on WhatsApp
              </Button>
              <Button
                href="/book-consultation"
                variant="ghostLight"
                size="lg"
              >
                Book a free consultation
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
