import Link from "next/link";
import {
  Envelope,
  Phone,
  MapPin,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { services, companyInfo } from "@/lib/data";

export function Footer() {
  return (
    <footer className="bg-navy-950 text-cream/80">
      <div className="container-page py-16 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2.5 mb-4">
            <span className="flex h-10 items-center justify-center rounded-lg bg-gold-500 px-2.5 font-display text-base font-semibold tracking-wide text-navy-950">
              PPIM
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-lg text-cream">
                {companyInfo.name}
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-cream/50">
                Priya Pratap Immigration Consulting
              </span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed text-cream/60 max-w-xs">
            Licensed immigration advice for people building their future in
            New Zealand — with offices in Auckland, Nadi and Suva.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-full border border-fern-400/30 bg-fern-500/10 px-3 py-2 w-fit">
            <ShieldCheck size={18} weight="fill" className="text-fern-400 shrink-0" />
            <span className="text-xs text-fern-50/90">{companyInfo.license}</span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-cream mb-4 tracking-wide uppercase">
            Visa Services
          </h3>
          <ul className="space-y-2.5">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services/${s.slug}`}
                  className="text-sm text-cream/60 hover:text-gold-400 transition-colors"
                >
                  {s.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-cream mb-4 tracking-wide uppercase">
            Firm
          </h3>
          <ul className="space-y-2.5">
            <li>
              <Link href="/about" className="text-sm text-cream/60 hover:text-gold-400 transition-colors">
                About &amp; your adviser
              </Link>
            </li>
            <li>
              <Link href="/services" className="text-sm text-cream/60 hover:text-gold-400 transition-colors">
                All services
              </Link>
            </li>
            <li>
              <Link href="/book-consultation" className="text-sm text-cream/60 hover:text-gold-400 transition-colors">
                Book a consultation
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-sm text-cream/60 hover:text-gold-400 transition-colors">
                Contact us
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-cream mb-4 tracking-wide uppercase">
            Get in touch
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2.5 text-sm text-cream/60">
              <MapPin size={18} className="mt-0.5 shrink-0 text-gold-400" />
              <span>
                {companyInfo.address}
                <span className="mt-1 block text-cream/45">
                  {companyInfo.fijiOffices}
                </span>
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-sm text-cream/60">
              <Phone size={18} className="shrink-0 text-gold-400" />
              <a href={`tel:${companyInfo.phone.replace(/\s/g, "")}`} className="hover:text-gold-400 transition-colors">
                {companyInfo.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5 text-sm text-cream/60">
              <Envelope size={18} className="shrink-0 text-gold-400" />
              <a href={`mailto:${companyInfo.email}`} className="hover:text-gold-400 transition-colors">
                {companyInfo.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-page py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream/40">
          <p>
            &copy; {new Date().getFullYear()} {companyInfo.name} Ltd. All rights reserved.
          </p>
          <p className="text-center sm:text-right max-w-md">
            {companyInfo.legalLine} Immigration advice is general in nature until
            confirmed in a paid engagement.
          </p>
        </div>
      </div>
    </footer>
  );
}
