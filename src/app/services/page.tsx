import type { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";
import { ServiceCard } from "@/components/ServiceCard";
import { Button } from "@/components/Button";
import {
  AnimatedSection,
  Stagger,
  StaggerItem,
} from "@/components/AnimatedSection";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbSchema } from "@/lib/schema";
import { services } from "@/lib/data";

export const metadata: Metadata = {
  title: "Visa Services",
  description:
    "Explore our licensed immigration services in Auckland: Skilled Migrant, Work, Student, Visitor, Partner & Family, and Business & Investor visas.",
  openGraph: {
    title: "Visa Services | PPIM Consulting",
    description:
      "Licensed immigration services for New Zealand: Skilled Migrant, Work, Student, Visitor, Partner & Family, and Business & Investor visas.",
  },
};

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <section className="bg-navy-950 py-24 text-cream md:py-32">
        <div className="container-page">
          <Reveal className="max-w-2xl">
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
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
