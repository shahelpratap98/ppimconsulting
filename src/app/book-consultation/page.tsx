import type { Metadata } from "next";
import { Calendar, Clock, ShieldCheck, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { ConsultationForm } from "@/components/ConsultationForm";
import { AnimatedSection } from "@/components/AnimatedSection";
import { companyInfo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Book a Free Consultation",
  description:
    "Book a free, no-obligation consultation with a licensed immigration adviser in Auckland, New Zealand.",
};

export default function BookConsultationPage() {
  return (
    <section className="py-20 md:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <AnimatedSection>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-600">
            Book a Consultation
          </span>
          <h1 className="mt-3 text-balance font-display text-4xl text-navy-900 md:text-5xl">
            Let&apos;s talk about your future in New Zealand.
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-navy-700/70">
            Share a few details and your licensed adviser will confirm your
            free, 30-minute consultation — in person at our Auckland office,
            by video call, or by phone.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900">
                <Clock size={20} weight="duotone" />
              </div>
              <div>
                <p className="font-medium text-navy-900">Response within 1 business day</p>
                <p className="text-sm text-navy-700/60">{companyInfo.hours}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900">
                <ShieldCheck size={20} weight="duotone" />
              </div>
              <div>
                <p className="font-medium text-navy-900">No obligation, ever</p>
                <p className="text-sm text-navy-700/60">
                  We&apos;ll only recommend proceeding if there&apos;s a genuine pathway.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900">
                <Calendar size={20} weight="duotone" />
              </div>
              <div>
                <p className="font-medium text-navy-900">Flexible scheduling</p>
                <p className="text-sm text-navy-700/60">
                  Evening and weekend slots available on request.
                </p>
              </div>
            </div>
          </div>

          <a
            href={companyInfo.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-navy-900/15 px-5 py-3 text-sm font-medium text-navy-900 transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/5"
          >
            <WhatsappLogo size={20} weight="fill" className="text-[#25D366]" />
            Prefer to chat now? Message us on WhatsApp
          </a>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="rounded-card border border-navy-900/10 bg-white/70 p-6 shadow-[0_20px_60px_-20px_rgba(13,29,46,0.15)] md:p-9">
            <ConsultationForm />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
