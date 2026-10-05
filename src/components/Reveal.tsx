import type { CSSProperties, ReactNode } from "react";

/**
 * CSS-only entrance reveal for above-the-fold content. Unlike the
 * framer-motion components, this never leaves content hidden if
 * JavaScript fails or is throttled (in-app browsers, low power mode).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  fade = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Set false on the page's main headline/text: browsers don't count
   *  opacity-0 text as painted, so fading it delays Largest Contentful Paint. */
  fade?: boolean;
}) {
  const base = fade ? "reveal-css" : "reveal-css-rise";
  return (
    <div
      className={className ? `${base} ${className}` : base}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
