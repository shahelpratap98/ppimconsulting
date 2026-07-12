import { Quotes } from "@phosphor-icons/react/dist/ssr";

export function TestimonialCard({
  name,
  origin,
  quote,
}: {
  name: string;
  origin: string;
  quote: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-card bg-navy-900 p-8 text-cream">
      <Quotes size={32} weight="fill" className="text-gold-500/80" />
      <p className="mt-5 flex-1 font-display text-lg italic leading-relaxed text-cream/90">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-6 border-t border-cream/10 pt-4">
        <p className="text-sm font-semibold text-cream">{name}</p>
        <p className="text-xs text-cream/50">{origin}</p>
      </div>
    </div>
  );
}
