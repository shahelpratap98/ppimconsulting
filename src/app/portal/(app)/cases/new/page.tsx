import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/portal/action-form";
import { requireAdviser } from "@/lib/portal/auth";
import { PATHWAYS } from "@/lib/portal/pathways";
import { createClient } from "@/lib/portal/supabase/server";
import { openCase } from "../actions";

export const metadata: Metadata = { title: "Open a case" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const me = await requireAdviser();
  const params = await searchParams;
  const preset = typeof params.client === "string" && UUID.test(params.client) ? params.client : "";

  const supabase = await createClient();
  const [clientsRes, advisersRes] = await Promise.all([
    supabase.from("clients").select("id, full_name, email").order("full_name").limit(2000),
    supabase.from("profiles").select("user_id, display_name").in("role", ["adviser", "admin"]).eq("is_active", true).order("display_name"),
  ]);
  const clients = clientsRes.data ?? [];
  const advisers = advisersRes.data ?? [];
  const nz = PATHWAYS.filter((p) => p.jurisdiction === "NZ" && p.key !== "other");
  const au = PATHWAYS.filter((p) => p.jurisdiction === "AU");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/portal/cases" className="text-sm font-semibold text-accent-600 hover:underline">← Cases</Link>
        <h1 className="mt-2 text-3xl font-semibold">Open a case</h1>
        <p className="mt-1 text-muted">
          The case gets the next case number and a starting document checklist for the pathway you pick. You can edit the checklist
          on the case afterwards.
        </p>
      </div>

      <ActionForm action={openCase} submitLabel="Open case" pendingLabel="Opening…" className="flex flex-col gap-6">
        <fieldset className="rounded-xl border border-line bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-ink">Client</legend>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="case-client" className="field-label">Existing client</label>
              <select id="case-client" name="client_id" defaultValue={preset} className="field">
                <option value="">— New client (fill in below) —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                    {c.email ? ` · ${c.email}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Or a new client</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nc-name" className="field-label">Full name</label>
                <input id="nc-name" name="new_client_name" maxLength={120} autoComplete="off" className="field" />
              </div>
              <div>
                <label htmlFor="nc-email" className="field-label">Email</label>
                <input id="nc-email" name="new_client_email" type="email" maxLength={200} autoComplete="off" className="field" />
              </div>
              <div>
                <label htmlFor="nc-phone" className="field-label">Phone</label>
                <input id="nc-phone" name="new_client_phone" type="tel" maxLength={40} autoComplete="off" className="field" />
              </div>
              <div>
                <label htmlFor="nc-country" className="field-label">Country of citizenship</label>
                <input id="nc-country" name="new_client_country" maxLength={80} autoComplete="off" className="field" />
              </div>
            </div>
            <p className="text-xs text-muted">A name typed here creates a new client, even if one is picked above.</p>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-line bg-surface p-5">
          <legend className="px-1 text-sm font-semibold text-ink">The matter</legend>
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="case-pathway" className="field-label">Visa pathway</label>
              <select id="case-pathway" name="pathway" required defaultValue="" className="field">
                <option value="" disabled>Choose a pathway…</option>
                <optgroup label="New Zealand">
                  {nz.map((p) => <option key={p.key} value={p.key}>{p.name} ({p.items.length} documents)</option>)}
                </optgroup>
                <optgroup label="Australia">
                  {au.map((p) => <option key={p.key} value={p.key}>{p.name} ({p.items.length} documents)</option>)}
                </optgroup>
                <option value="other">Other (empty checklist)</option>
              </select>
            </div>
            <div>
              <label htmlFor="case-title" className="field-label">Title</label>
              <input id="case-title" name="title" required maxLength={120} placeholder="e.g. Partnership visa — onshore, first application" className="field" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="case-adviser" className="field-label">Responsible adviser</label>
                <select id="case-adviser" name="adviser_id" defaultValue={me.user_id} className="field">
                  <option value="">— Not assigned —</option>
                  {advisers.map((a) => <option key={a.user_id} value={a.user_id}>{a.display_name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="case-fee" className="field-label">Agreed fee, excl. GST (optional)</label>
                <input id="case-fee" name="agreed_fee" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" className="field" />
              </div>
            </div>
          </div>
        </fieldset>
      </ActionForm>
    </div>
  );
}
