import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { VisaService } from "@/lib/data";

export function ServiceCard({ service }: { service: VisaService }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group relative flex flex-col rounded-card border border-navy-900/10 bg-white/70 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_-15px_rgba(13,29,46,0.25)] hover:border-gold-400/50"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-gold-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
        <service.icon size={24} weight="duotone" />
      </div>
      <h3 className="mt-5 font-display text-xl text-navy-900">
        {service.shortName}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-navy-700/70">
        {service.tagline}
      </p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 group-hover:gap-2.5 transition-all duration-300">
        Learn more
        <ArrowRight size={16} weight="bold" />
      </span>
    </Link>
  );
}
