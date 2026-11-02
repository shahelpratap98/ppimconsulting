"use client";

import { useState } from "react";

type Template = { key: string; label: string; subject: string; body: string };

// Pick a starting message, edit it, then send it from WhatsApp or email. The
// portal doesn't send anything itself, so what goes out is always from a person.
export function MessageComposer({ templates, email, whatsapp }: { templates: Template[]; email: string | null; whatsapp: string | null }) {
  const [key, setKey] = useState(templates[0].key);
  const [body, setBody] = useState(templates[0].body);
  const [copied, setCopied] = useState(false);
  const subject = templates.find((t) => t.key === key)?.subject ?? "";

  const pick = (next: string) => {
    setKey(next);
    setBody(templates.find((t) => t.key === next)?.body ?? "");
    setCopied(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
  };

  return (
    <section aria-labelledby="message-heading" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="message-heading" className="text-xl font-semibold">Send a message</h2>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Message template">
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={t.key === key}
            onClick={() => pick(t.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${t.key === key ? "border-ink bg-ink text-white" : "border-line text-muted hover:border-line-2 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label htmlFor="message-body" className="sr-only">Message</label>
      <textarea id="message-body" value={body} onChange={(e) => setBody(e.target.value)} rows={9} className="field mt-3" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {whatsapp ? (
          <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer" className="btn btn-primary">Open in WhatsApp</a>
        ) : null}
        {email ? (
          <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} className={`btn ${whatsapp ? "btn-quiet" : "btn-primary"}`}>Open in email</a>
        ) : null}
        <button type="button" onClick={copy} className="btn btn-quiet">{copied ? "Copied" : "Copy"}</button>
      </div>
      <p className="mt-2 text-xs text-muted">Only a licensed adviser can advise on eligibility or options. Keep staff messages to booking and paperwork.</p>
    </section>
  );
}
