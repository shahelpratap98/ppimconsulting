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
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={className ? `reveal-css ${className}` : "reveal-css"}
      style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
