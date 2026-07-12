import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";
import {
  AnimatedSection,
  Stagger,
  StaggerItem,
} from "@/components/AnimatedSection";
import { Reveal } from "@/components/Reveal";
import { services } from "@/lib/data";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return {};
  return {
    title: service.name,
    description: service.summary,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();

  const otherServices = services.filter((s) => s.slug !== service.slug);

  return (
    <>
      <section className="relative overflow-hidden bg-navy-950 py-24 text-cream md:py-32">
        <div className="container-page relative grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal className="max-w-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/15 text-gold-400">
              <service.icon size={28} weight="duotone" />
            </div>
            <h1 className="mt-6 text-balance font-display text-4xl md:text-5xl">
              {service.name}
            </h1>
            <p className="mt-5 text-balance text-lg leading-relaxed text-cream/70">
              {service.tagline}
            </p>
            <p className="mt-4 text-balance leading-relaxed text-cream/60">
              {service.summary}
            </p>
            <div className="mt-8">
              <Button href="/book-consultation" size="lg">
                Book a Free Consultation
                <ArrowRight size={18} weight="bold" />
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="md:pb-2">
            <ul className="space-y-3">
              {service.heroPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-2.5 rounded-full border border-cream/15 bg-cream/5 px-4 py-2.5 text-sm text-cream/80"
                >
                  <Check size={16} weight="bold" className="text-fern-400 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-page grid gap-16 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <AnimatedSection>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-600">
                Eligibility
              </span>
              <h2 className="mt-3 font-display text-3xl text-navy-900">
                What you&apos;ll typically need
              </h2>
            </AnimatedSection>

            <Stagger className="mt-8 space-y-4">
              {service.eligibility.map((item) => (
                <StaggerItem
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-navy-900/10 bg-white/70 px-5 py-4"
                >
                  <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-fern-500" />
                  <span className="leading-relaxed text-navy-800">{item}</span>
                </StaggerItem>
              ))}
            </Stagger>

            <AnimatedSection delay={0.1} className="mt-14">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-600">
                Frequently Asked
              </span>
              <h2 className="mt-3 font-display text-3xl text-navy-900">
                Common questions
              </h2>
              <div className="mt-6">
                <FaqAccordion items={service.faqs} />
              </div>
            </AnimatedSection>
          </div>

          <div>
            <AnimatedSection>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-600">
                Our Process
              </span>
              <h2 className="mt-3 font-display text-3xl text-navy-900">
                How we work with you
              </h2>
            </AnimatedSection>

            <Stagger className="relative mt-8 space-y-8 border-l border-navy-900/10 pl-8">
              {service.process.map((step, i) => (
                <StaggerItem key={step.title} className="relative">
                  <span className="absolute -left-[2.55rem] flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 font-display text-sm text-gold-400">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-lg text-navy-900">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 leading-relaxed text-navy-700/70">
                    {step.description}
                  </p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      <section className="bg-cream-100/60 py-24 md:py-32">
        <div className="container-page">
          <AnimatedSection>
            <SectionHeading
              eyebrow="Explore Other Pathways"
              title="Other visa categories we advise on"
            />
          </AnimatedSection>

          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {otherServices.map((s) => (
              <StaggerItem key={s.slug}>
                <a
                  href={`/services/${s.slug}`}
                  className="group flex flex-col rounded-2xl border border-navy-900/10 bg-white/70 p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <s.icon size={22} weight="duotone" className="text-gold-600" />
                  <span className="mt-3 font-medium text-navy-900">{s.shortName}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-gold-600 group-hover:gap-1.5 transition-all">
                    View pathway <ArrowRight size={12} weight="bold" />
                  </span>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="bg-navy-900 py-20 text-center text-cream">
        <div className="container-page">
          <AnimatedSection>
            <h2 className="font-display text-3xl md:text-4xl">
              Let&apos;s find your pathway together
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/70">
              Book a free consultation with a licensed adviser to discuss your
              {" "}{service.shortName.toLowerCase()} options.
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
