"use client";

import { useActionState, useEffect, useState } from "react";
import { Spinner } from "@/components/portal/spinner";
import { deleteEntries } from "./actions";

// Admin-only bulk delete on All entries. The row checkboxes live in the table
// (rendered on the server) and join this form through the HTML `form`
// attribute, so the table itself stays a server component.
export const BULK_FORM_ID = "bulk-delete-entries";

const boxes = () =>
  Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="ids"][form="${BULK_FORM_ID}"]`));
const selectable = () => boxes().filter((b) => !b.disabled);
const isRowBox = (t: EventTarget | null) =>
  t instanceof HTMLInputElement && t.name === "ids" && t.getAttribute("form") === BULK_FORM_ID;

function useSelectedCount() {
  const [count, setCount] = useState(0);
  const [all, setAll] = useState(0);
  useEffect(() => {
    const recount = () => {
      setCount(boxes().filter((b) => b.checked).length);
      setAll(selectable().length);
    };
    const onChange = (e: Event) => { if (isRowBox(e.target)) recount(); };
    recount();
    document.addEventListener("change", onChange);
    // rows disappear after a delete; recount when the table re-renders
    const table = document.getElementById("entries-table");
    const mo = table ? new MutationObserver(recount) : null;
    if (table && mo) mo.observe(table, { childList: true, subtree: true });
    return () => { document.removeEventListener("change", onChange); mo?.disconnect(); };
  }, []);
  return { count, all };
}

function setAllBoxes(checked: boolean) {
  const list = selectable();
  for (const b of list) b.checked = checked;
  // one bubbling change event is enough for every counter to recount
  list[0]?.dispatchEvent(new Event("change", { bubbles: true }));
}

export function SelectAllEntries() {
  const { count, all } = useSelectedCount();
  return (
    <input
      type="checkbox"
      aria-label={count === all && all > 0 ? "Clear selection" : "Select every entry that can be deleted"}
      className="size-4 accent-ink"
      disabled={all === 0}
      checked={all > 0 && count === all}
      ref={(el) => { if (el) el.indeterminate = count > 0 && count < all; }}
      onChange={(e) => setAllBoxes(e.currentTarget.checked)}
    />
  );
}

export function BulkDeleteBar() {
  const [state, formAction, pending] = useActionState(deleteEntries, undefined);
  const { count } = useSelectedCount();
  // The tick only counts for the exact selection it was given against: change
  // the selection, or finish a delete, and it has to be ticked again.
  const [confirmedFor, setConfirmedFor] = useState<{ count: number; state: typeof state } | null>(null);
  const confirmed = confirmedFor !== null && confirmedFor.count === count && confirmedFor.state === state;

  // The form is always rendered (empty when idle) so the row checkboxes,
  // which point at it by id, always have it as their form owner.
  const idle = count === 0 && !state;
  return (
    <form
      id={BULK_FORM_ID}
      action={formAction}
      hidden={idle}
      className={`flex flex-col gap-3 rounded-xl border p-4 print:hidden ${count > 0 ? "border-bad/40 bg-bad-bg/40" : "border-line bg-surface"}`}
    >
      {count > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            {count} {count === 1 ? "entry" : "entries"} selected
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="confirm"
              className="size-4 accent-ink"
              checked={confirmed}
              onChange={(e) => setConfirmedFor(e.currentTarget.checked ? { count, state } : null)}
            />
            Yes, permanently delete {count === 1 ? "this entry" : `these ${count} entries`}
          </label>
          <input type="hidden" name="expected" value={count} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || !confirmed} className="btn bg-bad text-white hover:opacity-90 disabled:opacity-50">
              {pending ? <><Spinner /> Deleting…</> : `Delete ${count} ${count === 1 ? "entry" : "entries"}`}
            </button>
            <button type="button" className="btn btn-quiet" disabled={pending} onClick={() => setAllBoxes(false)}>
              Clear selection
            </button>
          </div>
        </div>
      ) : null}
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${state.ok ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
