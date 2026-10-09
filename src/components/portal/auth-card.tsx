import type { ReactNode } from "react";
import { WEBSITE_URL } from "@/lib/portal/paths";

// Shared frame for the signed-out screens (login, reset, set password).
export function AuthCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-[420px]">
        <a href={WEBSITE_URL} className="inline-flex items-center gap-3" aria-label="PPIM Consulting website">
          <span className="rounded-lg bg-accent px-2.5 py-1.5 font-display text-base font-semibold tracking-wide text-ink">PPIM</span>
          <span className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">Staff Portal</span>
        </a>
        <div className="mt-4 rounded-2xl bg-surface p-7 shadow-xl sm:p-8">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {intro ? <p className="mt-2 text-[15px] text-muted">{intro}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-5 text-center text-sm text-white/70">{footer}</div> : null}
      </div>
    </main>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "ok"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-sm ${
        tone === "error" ? "bg-bad-bg text-bad" : "bg-ok-bg text-ok"
      }`}
    >
      {children}
    </p>
  );
}
