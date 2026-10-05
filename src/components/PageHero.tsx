import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Crumb } from "@/lib/schema";

/** Navy page header shared by the content pages (Australia, Fiji, legal). */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  intro,
  children,
}: {
  crumbs: Crumb[];
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-navy-950 py-24 text-cream md:py-32">
      <div className="container-page">
        <Reveal className="max-w-3xl" fade={false}>
          <Breadcrumbs crumbs={crumbs} />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-400">
            {eyebrow}
          </span>
          <h1 className="mt-3 text-balance font-display text-4xl md:text-5xl">
            {title}
          </h1>
          <p className="mt-6 text-balance text-lg leading-relaxed text-cream/75">
            {intro}
          </p>
          {children}
        </Reveal>
      </div>
    </section>
  );
}
