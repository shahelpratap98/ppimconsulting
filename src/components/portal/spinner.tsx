// The portal's one loading wheel. Inherits the text colour, so it works on
// dark and light buttons alike. Decorative by default: the text beside it
// ("Signing in…") is what screen readers announce.
export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={`shrink-0 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Shown in place of a page while the server builds it.
export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="size-8 text-accent-600" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}
