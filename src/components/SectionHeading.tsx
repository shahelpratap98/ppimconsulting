import clsx from "clsx";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  light = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  light?: boolean;
}) {
  return (
    <div
      className={clsx(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left"
      )}
    >
      {eyebrow && (
        <span
          className={clsx(
            "inline-block text-xs font-semibold uppercase tracking-[0.15em]",
            light ? "text-gold-400" : "text-gold-600"
          )}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={clsx(
          "mt-3 text-balance font-display text-3xl md:text-4xl",
          light ? "text-cream" : "text-navy-900"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={clsx(
            "mt-4 text-balance leading-relaxed",
            light ? "text-cream/70" : "text-navy-700/70"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
