import type { Metadata } from "next";
import {
  ArrowSquareOut,
  Envelope,
  MapPin,
  Phone,
  Clock,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { AnimatedSection, Stagger, StaggerItem } from "@/components/AnimatedSection";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/Button";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { companyInfo } from "@/lib/data";
import { pageOpenGraph } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact PPIM Consulting — licensed immigration adviser at 155 Smales Road, East Tāmaki, Auckland, with offices in Nadi and Suva, Fiji.",
  openGraph: pageOpenGraph(
    "Contact Us | PPIM Consulting",
    "Call, email, WhatsApp or visit our Auckland office — licensed immigration advice for New Zealand, Australia and Fiji.",
    "/contact"
  ),
};

const contactMethods = [
  {
    icon: Phone,
    title: "Call us",
    value: companyInfo.phone,
    href: `tel:${companyInfo.phone.replace(/\s/g, "")}`,
  },
  {
    icon: Envelope,
    title: "Email us",
    value: companyInfo.email,
    href: `mailto:${companyInfo.email}`,
  },
  {
    icon: WhatsappLogo,
    title: "WhatsApp",
    value: "Message us instantly",
    href: companyInfo.whatsapp,
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="bg-navy-950 py-24 text-cream md:py-32">
        <div className="container-page">
          <Reveal className="max-w-2xl" fade={false}>
            <Breadcrumbs
              crumbs={[
                { name: "Home", path: "/" },
                { name: "Contact", path: "/contact" },
              ]}
            />
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-400">
              Contact
            </span>
            <h1 className="mt-3 text-balance font-display text-4xl md:text-5xl">
              We&apos;d love to hear from you.
            </h1>
            <p className="mt-6 text-balance text-lg leading-relaxed text-cream/70">
              Visit our Auckland office, call, email, or message us on
              WhatsApp — whichever is easiest for you. Clients in Fiji and
              Australia can meet us by video or phone.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-page grid gap-16 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-navy-900">
              Get in touch
            </h2>
            <Stagger className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {contactMethods.map((m) => (
                <StaggerItem key={m.title}>
                  <a
                    href={m.href}
                    target={m.href.startsWith("http") ? "_blank" : undefined}
                    rel={m.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-4 rounded-2xl border border-navy-900/10 bg-white/70 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                      <m.icon size={22} weight={m.icon === WhatsappLogo ? "fill" : "duotone"} />
                    </div>
                    <div>
                      <p className="text-sm text-navy-700/70">{m.title}</p>
                      <p className="font-medium text-navy-900">{m.value}</p>
                    </div>
                  </a>
                </StaggerItem>
              ))}
            </Stagger>

            <AnimatedSection delay={0.15} className="mt-8 rounded-2xl border border-navy-900/10 bg-cream-100/60 p-6">
              <div className="flex items-start gap-3">
                <MapPin size={22} className="mt-0.5 shrink-0 text-gold-600" />
                <div>
                  <h3 className="font-sans text-base font-medium text-navy-900">
                    Auckland office
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-700/80">
                    {companyInfo.address}
                  </p>
                  <a
                    href={companyInfo.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:underline"
                  >
                    Get directions
                    <ArrowSquareOut size={14} weight="bold" />
                  </a>
                  <h3 className="mt-4 font-sans text-base font-medium text-navy-900">
                    Fiji offices — Nadi &amp; Suva
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-700/80">
                    Appointments in Nadi and Suva are arranged in advance —
                    message us on WhatsApp or call to book a time.{" "}
                    <Link href="/fiji" className="text-gold-600 hover:underline">
                      More about our Fiji offices
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3">
                <Clock size={22} className="mt-0.5 shrink-0 text-gold-600" />
                <div>
                  <h3 className="font-sans text-base font-medium text-navy-900">
                    Office hours
                  </h3>
                  <p className="mt-1 text-sm text-navy-700/80">{companyInfo.hours}</p>
                  <p className="text-sm text-navy-700/80">{companyInfo.hoursNote}</p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2} className="mt-8">
              <h2 className="font-display text-2xl text-navy-900">
                What happens when you get in touch
              </h2>
              <p className="mt-3 leading-relaxed text-navy-700/80">
                We reply within one business day to arrange a free initial
                consultation. In it, your adviser looks at your situation,
                explains which visa pathways are realistic, and tells you
                honestly if now isn&apos;t the right time to apply. If you
                decide to go ahead, you&apos;ll receive a written client
                agreement setting out the work and the fees before anything
                is charged.
              </p>
              <div className="mt-6">
                <Button href="/book-consultation" size="lg">
                  Book a Free Consultation
                </Button>
              </div>
            </AnimatedSection>
          </div>

          <AnimatedSection delay={0.1}>
            <div className="h-full min-h-[320px] overflow-hidden rounded-card border border-navy-900/10">
              <iframe
                title="PPIM Consulting office location map"
                className="h-full w-full min-h-[320px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=155+Smales+Road+East+Tamaki+Auckland+New+Zealand&output=embed"
              />
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
