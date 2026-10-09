import type { Metadata } from "next";
import { ActionForm } from "@/components/portal/action-form";
import { formatDay, todayNZ } from "@/lib/portal/dates";
import { createClient } from "@/lib/portal/supabase/server";
import { deleteHoliday, saveHoliday } from "../actions";

export const metadata: Metadata = { title: "Public holidays" };

const REGION = { NZ: "New Zealand", FJ: "Fiji" } as const;

export default async function HolidaysPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("public_holidays").select("day, region, name").order("day").order("region");
  const holidays = (data ?? []) as { day: string; region: "NZ" | "FJ"; name: string }[];
  const thisYear = todayNZ().slice(0, 4);
  const years = [...new Set(holidays.map((h) => h.day.slice(0, 4)))].filter((y) => y >= thisYear);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="new-holiday-heading" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="new-holiday-heading" className="text-xl font-semibold">Add a day off</h2>
        <p className="mt-1 text-sm text-muted">
          New Zealand holidays are never flagged as short days and aren&apos;t counted as leave. Fiji holidays are listed for
          reference (the Nadi and Suva offices) and don&apos;t change anyone&apos;s hours. Use this for an office shutdown day too.
          Adding a date that already exists renames it.
        </p>
        <ActionForm action={saveHoliday} submitLabel="Add day" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[12rem_10rem_minmax(0,1fr)]">
            <div>
              <label htmlFor="h-day" className="field-label">Date</label>
              <input id="h-day" name="day" type="date" required className="field" />
            </div>
            <div>
              <label htmlFor="h-region" className="field-label">Country</label>
              <select id="h-region" name="region" defaultValue="NZ" className="field">
                <option value="NZ">New Zealand</option>
                <option value="FJ">Fiji</option>
              </select>
            </div>
            <div>
              <label htmlFor="h-name" className="field-label">Name</label>
              <input id="h-name" name="name" required maxLength={80} className="field" placeholder="e.g. Office closed" />
            </div>
          </div>
        </ActionForm>
      </section>

      {years.length === 0 ? (
        <p className="rounded-xl border border-warn/30 bg-warn-bg px-4 py-3 text-sm text-warn">
          No holidays are loaded for {thisYear} onwards. Add them above so the hours check stays accurate.
        </p>
      ) : null}

      {years.map((year) => (
        <section key={year} aria-labelledby={`year-${year}`}>
          <h2 id={`year-${year}`} className="text-xl font-semibold">{year}</h2>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {holidays.filter((h) => h.day.startsWith(year)).map((h) => (
              <li key={h.day + h.region} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                <span className="w-40 text-sm tabular-nums">{formatDay(h.day, { weekday: "short", day: "numeric", month: "long" })}</span>
                <span className={`chip ${h.region === "NZ" ? "bg-steel-100 text-steel" : "bg-accent-100 text-accent-600"}`}>{REGION[h.region]}</span>
                <span className="font-semibold text-ink">{h.name}</span>
                <span className="flex-1" />
                <ActionForm action={deleteHoliday} submitLabel="Remove" pendingLabel="Removing…" quiet>
                  <input type="hidden" name="day" value={h.day} />
                  <input type="hidden" name="region" value={h.region} />
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
