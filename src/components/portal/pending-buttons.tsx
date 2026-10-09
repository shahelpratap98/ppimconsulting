"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/portal/spinner";

// Put inside a <Link>: shows the wheel from the moment that link is clicked
// until the new page takes over. Gives instant feedback on menu clicks.
export function LinkPending({ className = "size-3.5" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : null;
}

// Submit button for a <form action={serverAction}> rendered by a server
// component (e.g. Sign out): shows the wheel while the action runs.
export function ActionSubmit({ children, pendingLabel, className }: { children: ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`inline-flex items-center gap-2 disabled:opacity-70 ${className ?? ""}`}>
      {pending ? <><Spinner /> {pendingLabel}</> : children}
    </button>
  );
}

// Submit button for a plain GET form (filters, date pickers). Those reload the
// page, so there is no React pending state to read: listen for the form's own
// submit event and show the wheel until the new page replaces this one.
export function FilterSubmit({ children, className = "btn btn-primary" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const start = () => setBusy(true);
    const reset = () => setBusy(false); // coming back with the browser's Back button
    form.addEventListener("submit", start);
    window.addEventListener("pageshow", reset);
    return () => {
      form.removeEventListener("submit", start);
      window.removeEventListener("pageshow", reset);
    };
  }, []);

  return (
    <button ref={ref} type="submit" aria-busy={busy} className={`${className} ${busy ? "pointer-events-none opacity-80" : ""}`}>
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

// Excel and PDF files are built on the server and can take a few seconds.
// Fetching them here (instead of a bare link) lets the button show progress
// and explain a failure, e.g. the download rate limit.
export function DownloadButton({ href, children, busyLabel, className = "btn btn-quiet" }: { href: string; children: ReactNode; busyLabel: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(href, { credentials: "same-origin" });
      if (!res.ok) {
        setError(res.status === 429 ? "Too many downloads. Wait a few minutes and try again." : "The file couldn't be created. Try again.");
        return;
      }
      const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "download";
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("The download was interrupted. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={download} disabled={busy} className={className}>
        {busy ? <><Spinner /> {busyLabel}</> : children}
      </button>
      {error ? <span role="alert" className="text-sm font-semibold text-bad">{error}</span> : null}
    </span>
  );
}
