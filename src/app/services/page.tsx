import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/Button";
import {
  AnimatedSection,
  Stagger,
  StaggerItem,
} from "@/components/AnimatedSection";
import { Reveal } from "@/components/Reveal";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { pageOpenGraph } from "@/lib/seo";
import { services } from "@/lib/data";

export const metadata: Metadata = {
  title: "Visa Services",
  description:
    "Licensed immigration advice in Auckland for Skilled Migrant, Work, Student, Visitor, Partner & Family, and Business & Investor visas.",
  openGraph: pageOpenGraph(
    "Visa Services | PPIM Consulting",
    "Licensed immigration services for New Zealand: Skilled Migrant, Work, Student, Visitor, Partner & Family, and Business & Investor visas.",
    "/services"
  ),
};

export default function ServicesPage() {
  return (
    <>
      <section className="bg-navy-950 py-24 text-cream md:py-32">
        <div className="container-page">
          <Reveal className="max-w-2xl" fade={false}>
            <Breadcrumbs
              crumbs={[
                { name: "Home", path: "/" },
                { name: "Services", path: "/services" },
              ]}
            />
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-400">
              Our Services
            </span>
            <h1 className="mt-3 text-balance font-display text-4xl md:text-5xl">
              A pathway for every stage of your journey.
            </h1>
            <p className="mt-6 text-balance text-lg leading-relaxed text-cream/70">
              Immigration New Zealand&apos;s system is detailed and ever-changing.
              Your licensed adviser translates it into a plan specific to your
              circumstances — from your first Expression of Interest to your
              final residence approval.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl text-navy-900 md:text-4xl">
              New Zealand visa pathways we advise on
            </h2>
            <p className="mt-4 leading-relaxed text-navy-700/80">
              Each pathway has its own rules, evidence requirements and
              timing. Choose the one closest to your plans — or book a free
              consultation and we&apos;ll tell you which fits. Looking at
              Australia instead?{" "}
              <Link href="/australia" className="text-gold-600 underline underline-offset-2">
                See our Australian visa advice
              </Link>
              .
            </p>
          </div>
          <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <StaggerItem key={service.slug}>
                <ServiceCard service={service} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="bg-cream-100/60 py-20">
        <div className="container-page text-center">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Not sure where to start?"
              title="Every case starts with a free consultation"
              description="We'll assess your situation honestly and point you to the right pathway — even if that means telling you it's not the right time yet."
            />
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
