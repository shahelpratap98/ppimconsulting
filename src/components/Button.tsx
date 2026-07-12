import Link from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  className?: string;
  external?: boolean;
};

export function Button({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  external = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 ease-out active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500";

  const variants = {
    primary:
      "bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-[0_8px_24px_-8px_rgba(192,143,44,0.55)] hover:shadow-[0_10px_30px_-6px_rgba(192,143,44,0.65)] hover:-translate-y-0.5",
    secondary:
      "bg-navy-900 text-cream hover:bg-navy-800 hover:-translate-y-0.5",
    ghost:
      "bg-transparent text-navy-900 border border-navy-900/20 hover:border-navy-900/50 hover:bg-navy-900/5 dark:text-cream dark:border-cream/20 dark:hover:bg-cream/5",
  };

  const sizes = {
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const cls = clsx(base, variants[variant], sizes[size], className);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
