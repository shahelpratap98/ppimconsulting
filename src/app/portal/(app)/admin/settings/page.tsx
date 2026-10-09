import type { Metadata } from "next";
import { ActionForm } from "@/components/portal/action-form";
import { createClient } from "@/lib/portal/supabase/server";
import { saveSettings, sendTestEmail } from "../actions";
import { emailEnabled } from "@/lib/portal/email";

export const metadata: Metadata = { title: "Company & GST" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: s } = await supabase.from("settings").select("*").maybeSingle();

  if (!s) {
    return <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad">The settings row is missing. Re-run the seed migration.</p>;
  }

  const nextInvoice = `${s.invoice_prefix}${String(s.next_invoice_no).padStart(4, "0")}`;

  return (
    <div className="flex flex-col gap-8">
    <ActionForm action={saveSettings} submitLabel="Save settings" className="flex flex-col gap-8">
      <section aria-labelledby="company-heading" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="company-heading" className="text-xl font-semibold">Company details</h2>
        <p className="mt-1 text-sm text-muted">Printed at the top of every tax invoice.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="s-name" className="field-label">Company name</label>
            <input id="s-name" name="company_name" defaultValue={s.company_name} required className="field" />
          </div>
          <div>
            <label htmlFor="s-tagline" className="field-label">Trading name</label>
            <input id="s-tagline" name="trading_name" defaultValue={s.trading_name} className="field" />
          </div>
          <div>
            <label htmlFor="s-gstno" className="field-label">GST number</label>
            <input id="s-gstno" name="gst_number" defaultValue={s.gst_number ?? ""} className="field" placeholder="123-456-789" />
          </div>
          <div>
            <label htmlFor="s-contact" className="field-label">Contact line</label>
            <input id="s-contact" name="contact_line" defaultValue={s.contact_line ?? ""} className="field" placeholder="Phone · email" />
          </div>
          <div>
            <label htmlFor="s-address" className="field-label">Address</label>
            <textarea id="s-address" name="address" defaultValue={s.address ?? ""} rows={3} className="field" />
          </div>
          <div>
            <label htmlFor="s-bank" className="field-label">Bank details for payment</label>
            <textarea id="s-bank" name="bank_details" defaultValue={s.bank_details ?? ""} rows={3} className="field" placeholder="Account name and number" />
          </div>
        </div>
      </section>

      <section aria-labelledby="rules-heading" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="rules-heading" className="text-xl font-semibold">Timesheet, case and invoice rules</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="s-gst" className="field-label">GST (%)</label>
            <input id="s-gst" name="gst_percent" type="number" min={0} max={99} step={0.01} defaultValue={Number((s.gst_rate * 100).toFixed(2))} required className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="s-std" className="field-label">Standard day (hours)</label>
            <input id="s-std" name="standard_day_hours" type="number" min={0.25} max={24} step={0.25} defaultValue={s.standard_day_hours} required className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="s-prefix" className="field-label">Invoice prefix</label>
            <input id="s-prefix" name="invoice_prefix" defaultValue={s.invoice_prefix} maxLength={12} className="field" />
          </div>
          <div>
            <label htmlFor="s-next" className="field-label">Next invoice number</label>
            <input id="s-next" name="next_invoice_no" type="number" min={1} step={1} defaultValue={s.next_invoice_no} required className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="s-cprefix" className="field-label">Case number prefix</label>
            <input id="s-cprefix" name="case_prefix" defaultValue={s.case_prefix} maxLength={12} className="field" />
          </div>
          <div>
            <label htmlFor="s-cnext" className="field-label">Next case number</label>
            <input id="s-cnext" name="next_case_no" type="number" min={1} step={1} defaultValue={s.next_case_no} required className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="s-terms" className="field-label">Payment terms (days)</label>
            <input id="s-terms" name="payment_terms_days" type="number" min={0} max={365} step={1} defaultValue={s.payment_terms_days} required className="field tabular-nums" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="s-annual" className="field-label">Annual leave (days/yr)</label>
            <input id="s-annual" name="annual_leave_days" type="number" min={0} max={365} step={0.5} defaultValue={s.annual_leave_days ?? 20} required className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="s-sick" className="field-label">Sick leave (days/yr)</label>
            <input id="s-sick" name="sick_leave_days" type="number" min={0} max={365} step={0.5} defaultValue={s.sick_leave_days ?? 10} required className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="s-sickcap" className="field-label">Sick leave cap (days)</label>
            <input id="s-sickcap" name="sick_leave_cap_days" type="number" min={0} max={365} step={0.5} defaultValue={s.sick_leave_cap_days ?? 20} required className="field tabular-nums" />
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          NZ minimums: 20 days&apos; annual leave (4 weeks on a 5-day week), 10 days&apos; sick leave carrying over to a maximum of 20. Unused annual leave always carries over. A person&apos;s own entitlement, start date and opening balances are set under Staff.
        </p>
        <p className="mt-3 text-sm text-muted">
          The next invoice will be numbered <span className="font-semibold text-ink">{nextInvoice}</span> and the next case <span className="font-semibold text-ink">{`${s.case_prefix}${String(s.next_case_no).padStart(4, "0")}`}</span>. Set GST to 0 if the practice isn&apos;t GST registered. Days shorter than the standard day are flagged in the hours check.
        </p>
      </section>
    </ActionForm>

    <section aria-labelledby="email-heading" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="email-heading" className="text-xl font-semibold">Email</h2>
      {emailEnabled() ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Sending as <span className="font-semibold text-ink">{process.env.EMAIL_FROM}</span>. Invites, sign-in links, returned entries and leave decisions go out automatically.
          </p>
          <ActionForm action={sendTestEmail} submitLabel="Send a test email" pendingLabel="Sending…" quiet className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-64">
              <label htmlFor="test-to" className="field-label">Send to</label>
              <input id="test-to" name="to" type="email" placeholder="Your own address" className="field" />
            </div>
          </ActionForm>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">Email isn&apos;t switched on. Set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> on the server to enable it.</p>
      )}
    </section>
    </div>
  );
}
