"use client";

import { useId, useState } from "react";

// A read-only value with a Copy button (sign-in links for staff).
export function CopyField({ value }: { value: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the field is selectable, so it can be copied by hand.
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1 basis-64">
        <label htmlFor={id} className="field-label">One-time sign-in link</label>
        <input id={id} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="field font-mono text-xs" />
      </div>
      <button type="button" onClick={copy} className="btn btn-quiet">
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
