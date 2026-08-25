import type { Metadata } from "next";
import Image from "next/image";
import { ShieldCheck, Compass, HandHeart } from "@phosphor-icons/react/dist/ssr";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/Button";
import {
  AnimatedSection,
  Stagger,
  StaggerItem,
} from "@/components/AnimatedSection";
import { Reveal } from "@/components/Reveal";
import { team, companyInfo } from "@/lib/data";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Meet PPIM Consulting — Priya Pratap Immigration Consulting, a licensed Auckland immigration advisory practice with offices in Nadi and Suva, Fiji.",
};

const values = [
  {
    icon: ShieldCheck,
    title: "Integrity first",
    description:
      "We only take on cases we believe have a genuine, well-founded pathway — and we tell you plainly when one doesn't.",
  },
  {
    icon: Compass,
    title: "Clarity over jargon",
    description:
      "Immigration law is complex. Our job is to translate it into a plan you actually understand and can act on.",
  },
  {
    icon: HandHeart,
    title: "People, not files",
    description:
      "Behind every application is a family's future. We treat each case with the care that deserves.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy-950 py-24 text-cream md:py-32">
        <div className="container-page">
          <Reveal className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-400">
              About Us
            </span>
            <h1 className="mt-3 text-balance font-display text-4xl md:text-5xl">
              A licensed adviser who treats your future like it matters.
            </h1>
            <p className="mt-6 text-balance text-lg leading-relaxed text-cream/70">
              Priya Pratap Immigration Consulting (PPIM Consulting) is an
              Auckland-based immigration practice with offices in Nadi and
              Suva, Fiji — built on the personal attention every client
              deserves.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-page grid gap-12 md:grid-cols-2 md:items-center">
          <AnimatedSection>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-600">
              Our Story
            </span>
            <h2 className="mt-3 font-display text-3xl text-navy-900 md:text-4xl">
              Built on a simple belief: honest advice changes lives.
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed text-navy-700/80">
              <p>
                Our founder, Priya Pratap, established PPIM Consulting after
                seeing too many migrants receive vague, inconsistent guidance
                from unlicensed operators — and set out to offer something
                different: licensed, personally accountable advice.
              </p>
              <p>
                Priya holds a current license with the Immigration Advisers
                Authority (IAA) and is also a Registered Migration Agent in
                Australia — personally accountable for the advice she gives
                on both sides of the Tasman. From our Auckland office and
                our Fiji offices in Nadi and Suva, we manage residence,
                work, student, visitor, partnership and investor cases for
                clients across the Pacific and beyond.
              </p>
            </div>
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-fern-500/20 bg-fern-50 px-5 py-4 w-fit">
                <ShieldCheck size={24} weight="fill" className="text-fern-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-fern-700">
                    {companyInfo.license}
                  </p>
                  <p className="text-xs text-fern-700/70">
                    Verifiable on the Immigration Advisers Authority register.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-fern-500/20 bg-fern-50 px-5 py-4 w-fit">
                <ShieldCheck size={24} weight="fill" className="text-fern-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-fern-700">
                    {companyInfo.licenseAu}
                  </p>
                  <p className="text-xs text-fern-700/70">
                    Verifiable on the Office of the MARA register.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="overflow-hidden rounded-card bg-cream-100">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src="/priya-pratap.jpg"
                  alt="Priya Pratap, Founder and Licensed Immigration Adviser, at her desk"
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover object-top"
                  priority
                />
              </div>
              <div className="p-8 md:p-10">
                <p className="font-display text-2xl italic text-navy-900">
                  &ldquo;We don&apos;t just file paperwork — we build the strongest,
                  most honest case for your future.&rdquo;
                </p>
                <p className="mt-4 text-sm text-navy-700/70">
                  Priya Pratap, Founder &amp; Licensed Immigration Adviser
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="bg-cream-100/60 py-24 md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="What Drives Us"
              title="Our values in practice"
            />
          </AnimatedSection>

          <Stagger className="mt-14 grid gap-8 md:grid-cols-3">
            {values.map((v) => (
              <StaggerItem key={v.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-400">
                  <v.icon size={26} weight="duotone" />
                </div>
                <h3 className="mt-5 font-display text-xl text-navy-900">
                  {v.title}
                </h3>
                <p className="mt-2.5 leading-relaxed text-navy-700/70">
                  {v.description}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Meet Your Adviser"
              title="Licensed, personally accountable"
              description="Every case is led personally by your adviser — not a call centre."
            />
          </AnimatedSection>

          <Stagger className="mx-auto mt-14 grid max-w-xl gap-6">
            {team.map((member) => (
              <StaggerItem
                key={member.name}
                className="rounded-card border border-navy-900/10 bg-white/70 p-7"
              >
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-gold-400/40">
                  <Image
                    src="/priya-pratap.jpg"
                    alt={`${member.name}, ${member.role}`}
                    fill
                    sizes="80px"
                    className="object-cover object-top"
                  />
                </div>
                <h3 className="mt-5 font-display text-lg text-navy-900">
                  {member.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-gold-600">
                  {member.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-navy-700/70">
                  {member.bio}
                </p>
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-fern-600">
                    <ShieldCheck size={16} weight="fill" />
                    {member.license}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-fern-600">
                    <ShieldCheck size={16} weight="fill" />
                    {member.licenseAu}
                  </div>
                </div>
                <div className="mt-4 space-y-1 border-t border-navy-900/10 pt-4 text-sm">
                  <a
                    href={`mailto:${companyInfo.email}`}
                    className="block text-navy-800 transition-colors hover:text-gold-600"
                  >
                    {companyInfo.email}
                  </a>
                  <a
                    href={`tel:${companyInfo.phone.replace(/\s/g, "")}`}
                    className="block text-navy-800 transition-colors hover:text-gold-600"
                  >
                    {companyInfo.phone}
                  </a>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="bg-navy-900 py-20 text-center text-cream">
        <div className="container-page">
          <AnimatedSection>
            <h2 className="font-display text-3xl md:text-4xl">
              Ready to meet your adviser?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/70">
              Book a free consultation and speak directly with a licensed
              immigration adviser about your options.
            </p>
            <div className="mt-8">
              <Button href="/book-consultation" size="lg">
                Book a Free Consultation
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
