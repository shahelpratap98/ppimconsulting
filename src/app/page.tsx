import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  FacebookLogo,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceCard } from "@/components/ServiceCard";
import { StatCounter } from "@/components/StatCounter";
import {
  AnimatedSection,
  Stagger,
  StaggerItem,
} from "@/components/AnimatedSection";
import { Reveal } from "@/components/Reveal";
import { services, facebookReviews, stats, companyInfo } from "@/lib/data";

const whyUs = [
  {
    icon: ShieldCheck,
    title: "Licensed & accountable",
    description:
      "Every case is led by an adviser licensed with the Immigration Advisers Authority — regulated, insured, and accountable to you.",
  },
  {
    icon: Clock,
    title: "Straight answers, fast",
    description:
      "We tell you where you stand in your first consultation, not three weeks later. No jargon, no false hope.",
  },
  {
    icon: UsersThree,
    title: "With you the whole way",
    description:
      "From your first enquiry to visa grant, one adviser owns your case — you're never passed between strangers.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-900 text-cream">
        <svg
          className="pointer-events-none absolute -right-24 -top-24 h-[560px] w-[560px] opacity-[0.15] md:opacity-20"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M100 10 C 60 40, 40 90, 100 190 C 105 140, 108 90, 150 60 C 120 70, 105 50, 100 10 Z"
            stroke="currentColor"
            className="text-gold-400"
            strokeWidth="0.6"
          />
          <path
            d="M100 30 C 75 55, 62 95, 100 175"
            stroke="currentColor"
            className="text-gold-400"
            strokeWidth="0.4"
          />
        </svg>

        <div className="container-page relative py-28 md:py-36">
          <div className="max-w-2xl">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-xs font-medium text-gold-300">
                <ShieldCheck size={16} weight="fill" />
                IAA Licensed Immigration Adviser &middot; Auckland, NZ
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-6 text-balance font-display text-4xl leading-[1.1] md:text-6xl">
                Your pathway to{" "}
                <span className="italic text-gold-400">New Zealand</span>{" "}
                starts with clear advice.
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-cream/70">
                PPIM Consulting is an Auckland-based immigration consultancy
                — with offices in Nadi and Suva, Fiji — helping skilled
                professionals, students, families and investors build a
                genuine future in New Zealand, with licensed advice you can
                trust.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Button href="/book-consultation" size="lg">
                  Book a Free Consultation
                  <ArrowRight size={18} weight="bold" />
                </Button>
                <Button
                  href="/services"
                  variant="ghost"
                  size="lg"
                  className="border-cream/25 text-cream hover:bg-cream/5 hover:border-cream/50"
                >
                  Explore visa pathways
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-navy-900/10 bg-cream-100/60">
        <div className="container-page py-12">
          <Stagger className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s) => (
              <StaggerItem key={s.label}>
                <StatCounter value={s.value} suffix={s.suffix} label={s.label} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Visa Pathways"
              title="Guidance for every stage of your journey"
              description="Whichever pathway fits your goals, your licensed adviser builds a clear, honest strategy around your circumstances."
            />
          </AnimatedSection>

          <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <StaggerItem key={service.slug}>
                <ServiceCard service={service} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-navy-900 py-24 text-cream md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Why PPIM Consulting"
              title="Advice built on accountability"
              light
            />
          </AnimatedSection>

          <Stagger className="mt-14 grid gap-10 md:grid-cols-3">
            {whyUs.map((item) => (
              <StaggerItem key={item.title} className="text-center md:text-left">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-400 md:mx-0">
                  <item.icon size={26} weight="duotone" />
                </div>
                <h3 className="mt-5 font-display text-xl">{item.title}</h3>
                <p className="mt-2.5 leading-relaxed text-cream/60">
                  {item.description}
                </p>
              </StaggerItem>
            ))}
          </Stagger>

          <AnimatedSection
            delay={0.1}
            className="mt-16 flex justify-center md:justify-start"
          >
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 md:justify-start">
              {[
                "Full-service application management",
                "Transparent fixed-fee pricing",
                "Confidential, judgment-free advice",
              ].map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm text-cream/70">
                  <Check size={16} weight="bold" className="text-fern-400" />
                  {point}
                </li>
              ))}
            </ul>
          </AnimatedSection>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Client Reviews"
              title="Real people, real pathways"
              description="Our clients rate their experience with us publicly on Facebook."
            />
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="mx-auto mt-14 flex max-w-3xl flex-col items-center gap-8 rounded-card border border-navy-900/10 bg-white/70 px-8 py-12 text-center md:flex-row md:justify-between md:px-12 md:text-left">
              <div className="flex flex-col items-center gap-1 md:items-start">
                <span className="font-display text-5xl text-navy-900 md:text-6xl">
                  {facebookReviews.recommendPercent}%
                </span>
                <span className="text-sm font-medium text-navy-700/70">
                  recommend us
                </span>
              </div>
              <div className="flex flex-col items-center gap-2 md:items-start">
                <p className="max-w-xs text-balance text-navy-700/80">
                  {facebookReviews.reviewCount} client reviews and{" "}
                  {facebookReviews.followers} followers on our Facebook page.
                </p>
                <a
                  href={facebookReviews.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-3 text-sm font-medium text-cream transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <FacebookLogo size={20} weight="fill" />
                  Read our reviews on Facebook
                </a>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gold-500 py-20 text-navy-950">
        <div className="container-page relative flex flex-col items-center gap-6 text-center">
          <AnimatedSection>
            <h2 className="text-balance font-display text-3xl md:text-4xl">
              Ready to talk about your future in New Zealand?
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <p className="max-w-xl text-balance text-navy-900/80">
              Book a free, no-obligation consultation with a licensed adviser
              and leave with a clear plan for your visa pathway.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.2} className="flex flex-wrap justify-center gap-4">
            <Button href="/book-consultation" variant="secondary" size="lg">
              Book a Free Consultation
            </Button>
            <Link
              href={`tel:${companyInfo.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 px-6 py-4 text-sm font-medium text-navy-950 underline decoration-navy-950/30 underline-offset-4 hover:decoration-navy-950"
            >
              or call {companyInfo.phone}
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
