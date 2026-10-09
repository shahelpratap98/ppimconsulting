import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/portal/action-form";
import { createClient } from "@/lib/portal/supabase/server";
import { saveClient } from "../actions";

export const metadata: Metadata = { title: "Clients" };

type ClientRow = { id: string; full_name: string; email: string | null; phone: string | null; country: string | null; notes: string };

export function ClientFields({ c }: { c?: ClientRow }) {
  const k = c?.id ?? "new";
  return (
    <>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor={`cname-${k}`} className="field-label">Full name (appears as &quot;Bill to&quot;)</label>
          <input id={`cname-${k}`} name="full_name" defaultValue={c?.full_name} required maxLength={120} className="field" />
        </div>
        <div>
          <label htmlFor={`cemail-${k}`} className="field-label">Email</label>
          <input id={`cemail-${k}`} name="email" type="email" defaultValue={c?.email ?? ""} className="field" />
        </div>
        <div>
          <label htmlFor={`cphone-${k}`} className="field-label">Phone / WhatsApp</label>
          <input id={`cphone-${k}`} name="phone" type="tel" defaultValue={c?.phone ?? ""} maxLength={40} className="field" />
        </div>
        <div>
          <label htmlFor={`ccountry-${k}`} className="field-label">Country they live in</label>
          <input id={`ccountry-${k}`} name="country" defaultValue={c?.country ?? ""} maxLength={60} className="field" placeholder="e.g. Fiji" />
        </div>
      </div>
      <div>
        <label htmlFor={`cnotes-${k}`} className="field-label">Notes</label>
        <textarea id={`cnotes-${k}`} name="notes" defaultValue={c?.notes ?? ""} rows={2} maxLength={2000} className="field" />
      </div>
    </>
  );
}

export default async function ClientsPage() {
  const supabase = await createClient();
  const [clientsRes, casesRes] = await Promise.all([
    supabase.from("clients").select("id, full_name, email, phone, country, notes").order("full_name"),
    supabase.from("cases").select("id, case_no, client_id, status").order("case_no"),
  ]);
  const clients = (clientsRes.data ?? []) as ClientRow[];
  const casesFor = (id: string) => (casesRes.data ?? []).filter((c) => c.client_id === id);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="new-client-heading" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="new-client-heading" className="text-xl font-semibold">Add a client</h2>
        <p className="mt-1 text-sm text-muted">Advisers can also add a client while opening a new case.</p>
        <ActionForm action={saveClient} submitLabel="Add client" className="mt-4 flex flex-col gap-4">
          <ClientFields />
        </ActionForm>
      </section>

      <section aria-labelledby="clients-heading">
        <h2 id="clients-heading" className="text-xl font-semibold">Clients ({clients.length})</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {clients.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-surface">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 px-4 py-3">
                  <span className="font-semibold text-ink">{c.full_name}</span>
                  <span className="text-sm text-muted">{[c.email, c.country].filter(Boolean).join(" · ") || "No contact details"}</span>
                  <span className="ml-auto flex flex-wrap gap-1.5">
                    {casesFor(c.id).map((k) => (
                      <Link key={k.id} href={`/portal/cases/${k.id}`} className="chip bg-steel-100 text-steel hover:underline">{k.case_no}</Link>
                    ))}
                  </span>
                </summary>
                <div className="border-t border-line px-4 py-4">
                  <ActionForm action={saveClient} submitLabel="Save changes" className="flex flex-col gap-4">
                    <ClientFields c={c} />
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
