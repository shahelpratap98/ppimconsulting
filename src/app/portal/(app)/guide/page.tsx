import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { isAdmin, isAdviser, requireProfile } from "@/lib/portal/auth";
import { createClient } from "@/lib/portal/supabase/server";

export const metadata: Metadata = { title: "Guide" };

// The guide is assembled on the server from the reader's role, so a staff
// member's page never contains the adviser or admin instructions at all.
type Audience = "everyone" | "adviser" | "admin";
type Section = { id: string; title: string; audience: Audience; body: ReactNode };

const AUDIENCE_LABEL: Record<Audience, string> = { everyone: "Everyone", adviser: "Advisers", admin: "Admins" };
const AUDIENCE_CHIP: Record<Audience, string> = {
  everyone: "bg-steel-100 text-steel",
  adviser: "bg-accent-100 text-accent-600",
  admin: "bg-ink text-white",
};

function Steps({ children }: { children: ReactNode }) {
  return <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 marker:font-semibold marker:text-ink">{children}</ol>;
}
function Points({ children }: { children: ReactNode }) {
  return <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 marker:text-muted">{children}</ul>;
}
function Term({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-ink">{children}</span>;
}
function Tip({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-lg border border-line bg-surface-2 px-4 py-3 text-[15px]"><Term>Good to know: </Term>{children}</p>;
}
function Go({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="font-semibold text-accent-600 underline-offset-4 hover:underline">{children}</Link>;
}

export default async function GuidePage() {
  const profile = await requireProfile();
  const adviser = isAdviser(profile.role);
  const admin = isAdmin(profile.role);

  const supabase = await createClient();
  const { data: settings } = await supabase.from("settings").select("standard_day_hours").maybeSingle();
  const standard = Number(profile.standard_day_hours ?? settings?.standard_day_hours ?? 8);

  const sections: Section[] = [
    {
      id: "signing-in",
      title: "Signing in and your password",
      audience: "everyone",
      body: (
        <>
          <p>
            The portal lives at <Term>ppimconsulting.co.nz/portal</Term>, with a <Term>Staff login</Term> link at the bottom of every page of the website.
            It works on a phone, tablet or computer, with nothing to install.
          </p>
          <Points>
            <li><Term>First time:</Term> you&apos;ll get an email with a one-time link (or an admin will pass it to you). Open it, choose a password of at least 12 characters, and you&apos;re in. The link works once and expires after 24 hours; if it has expired, ask an admin for a new one. Check your spam folder if the email doesn&apos;t arrive.</li>
            <li><Term>Forgot your password:</Term> choose &quot;Forgot your password?&quot; on the sign-in page and follow the email link, or ask an admin to send you a new sign-in link.</li>
            <li><Term>Change your password:</Term> click your name in the top bar to open <Go href="/portal/account">My account</Go>.</li>
            <li><Term>Shared computer:</Term> use <Term>Sign out</Term> in the top bar when you finish. The portal holds client information, so never leave it signed in on a shared machine.</li>
          </Points>
          <Tip>After 5 wrong passwords the portal pauses sign-in for that account for about 15 minutes. That stops password guessing; just wait, or reset your password.</Tip>
          <h3 className="mt-5 text-base font-semibold text-ink">On a phone</h3>
          <p className="mt-2">
            Everything works the same on a phone. The menu is a bar along the bottom of the screen with the pages you use most; <Term>More</Term> opens the rest, plus My account and Sign out.
            Open the portal in your phone&apos;s browser and choose <Term>Add to Home Screen</Term> (Share menu on iPhone, browser menu on Android) and it behaves like an app.
          </p>
        </>
      ),
    },
    {
      id: "cases",
      title: "Cases and the document checklist",
      audience: "everyone",
      body: (
        <>
          <p>
            Every client matter is a <Term>case</Term> with its own number, such as CASE-0012. <Go href="/portal/cases">Cases</Go> lists them with how many documents have
            come in and the hours spent. Search by client name, case number or title, and use the tabs to see open, decided or closed cases.
          </p>
          <p className="mt-3">Open a case to see its <Term>document checklist</Term>, which starts from the list for its visa pathway (Skilled Migrant, Partnership, AEWV, Student, Visitor, the Australian visas and so on).</p>
          <Points>
            <li>Click a document&apos;s status to move it along: <span className="chip bg-surface-2 text-muted">Missing</span> → <span className="chip bg-ok-bg text-ok">Received</span> → <span className="chip bg-warn-bg text-warn">Flagged</span> and back to Missing. It saves straight away.</li>
            <li>Use <Term>Flagged</Term> when something arrived but can&apos;t be used yet, such as an expired police certificate or an uncertified copy. Choose <Term>Add note</Term> to say what&apos;s wrong; the note goes into the follow-up email.</li>
            <li><Term>Add a document</Term> at the bottom covers anything the standard list doesn&apos;t, and <Term>✕</Term> removes one that doesn&apos;t apply to this client.</li>
            <li>The ring at the top shows how much of the file is in. It turns amber while anything is flagged.</li>
          </Points>
          <h3 className="mt-5 text-base font-semibold text-ink">Chasing documents</h3>
          <p className="mt-2">
            While anything is missing or flagged, <Term>Follow-up email</Term> under the checklist has a ready-written email listing exactly what is still needed, with your notes on flagged items.
            Read it through, then <Term>Copy email</Term> or <Term>Open in mail app</Term> to send it from your own mailbox. Nothing is ever sent from the portal itself.
          </p>
          <Tip>The starting checklists are a guide, not legal advice. Requirements change, so check each case against current Immigration New Zealand or Home Affairs guidance and edit the list to suit.</Tip>
        </>
      ),
    },
    {
      id: "entering-time",
      title: "Entering your time",
      audience: "everyone",
      body: (
        <>
          <p><Go href="/portal/my/day">My day</Go> is where you record what you worked on. It opens on today.</p>
          <Steps>
            <li>Pick the day. Use the week strip, the <Term>Previous / Next week</Term> links, or <Term>Go to date</Term> for anything further back.</li>
            <li>Choose the <Term>Case</Term>. Cases are listed by number and client. Office time that isn&apos;t for a client (admin, training, team meetings) goes on <Term>Office &amp; admin</Term>.</li>
            <li>Choose the <Term>Work type</Term>: consultation, document review, application preparation, lodgement, INZ / Home Affairs correspondence and so on.</li>
            <li>Enter <Term>Hours</Term> as a decimal: 1.5 means one and a half hours, 0.25 is fifteen minutes.</li>
            <li>Write a short <Term>Task description</Term>, e.g. &quot;Reviewed partnership evidence, drafted cover letter&quot;.</li>
            <li>Worked on more than one thing? Choose <Term>+ Add another entry</Term> and repeat.</li>
          </Steps>
          <p className="mt-4">The running total at the top right shows your hours against your standard day of <Term>{standard} hours</Term>, and how much is still to go.</p>
          <Tip>Time on each case is how the practice sees whether a fixed fee covered the work. Log it against the right case, even for short calls and emails.</Tip>
        </>
      ),
    },
    {
      id: "draft-and-submit",
      title: "Save draft or submit the day",
      audience: "everyone",
      body: (
        <>
          <Points>
            <li><Term>Save draft</Term> keeps what you&apos;ve typed so you can come back to it. Drafts can be half-finished. They don&apos;t count towards your hours yet and nobody is asked to approve them.</li>
            <li><Term>Submit day for approval</Term> sends the day to be signed off. Every entry has to be complete first: case, work type, hours and a description. If something is missing, the portal highlights that entry and submits nothing until it&apos;s fixed.</li>
          </Points>
          <p className="mt-4">
            Once submitted, entries move to <Term>Already submitted for this day</Term> underneath and can no longer be edited by you. Forgot something?
            Add another entry on the same day and submit again. Need a submitted entry changed? Ask an adviser to return it to you.
          </p>
          <Tip>A day can hold up to 24 hours and 50 entries.</Tip>
        </>
      ),
    },
    {
      id: "week-strip",
      title: "Reading the week strip",
      audience: "everyone",
      body: (
        <>
          <p>The seven boxes at the top of My day show your submitted hours for each day of the week.</p>
          <Points>
            <li><span className="chip bg-warn-bg text-warn">Short 2.5</span> a past weekday with fewer than {standard} hours submitted, and how many are missing.</li>
            <li><span className="chip bg-ok-bg text-ok">Full day</span> or <span className="chip bg-ok-bg text-ok">+1</span> you&apos;ve reached your standard day, or gone over it by that much.</li>
            <li><span className="chip bg-bad-bg text-bad">Returned</span> an adviser has sent something back for you to fix (see below).</li>
            <li><Term>Draft</Term> there is unsent work saved on that day.</li>
            <li><Term>Holiday</Term>, <Term>Leave</Term> and weekends are never marked short. If you do work on one, enter it as normal and it counts as extra hours.</li>
          </Points>
        </>
      ),
    },
    {
      id: "returned",
      title: "When an entry is returned to you",
      audience: "everyone",
      body: (
        <>
          <p>If an adviser spots a problem, such as time on the wrong case, they return the entry with a note instead of approving it.</p>
          <Steps>
            <li>You get an email with the note, and the day turns red in your week strip. Open it.</li>
            <li>The returned entry is editable again, with the adviser&apos;s note shown in red at the top of it.</li>
            <li>Fix it, then choose <Term>Submit day for approval</Term> again.</li>
          </Steps>
        </>
      ),
    },
    {
      id: "my-hours",
      title: adviser ? "Checking your own hours" : "My hours",
      audience: "everyone",
      body: (
        <>
          <p>
            {adviser ? <>Under <Go href="/portal/reports">Reports</Go>, two reports cover your own time:</> : <><Go href="/portal/reports">My hours</Go> in the top bar has two reports about your own time:</>}
          </p>
          <Points>
            <li><Term>Hours check</Term> lists every day in a date range with its status: <span className="chip bg-bad-bg text-bad">SHORT by 2 hrs</span>, <span className="chip bg-warn-bg text-warn">Over by 1 hrs</span>, <span className="chip bg-ok-bg text-ok">OK - full day</span>, <span className="chip bg-steel-100 text-steel">Public holiday</span> or <span className="chip bg-accent-100 text-accent-600">On leave</span>, plus totals. Use it on a Friday to find any day you forgot.</li>
            <li><Term>{adviser ? "Time by person" : "My time"}</Term> shows your time split by case, then every entry line by line.</li>
          </Points>
          <p className="mt-4">Set the dates and choose <Term>Update</Term>. <Term>Download CSV</Term> saves what is on screen for Excel, and <Term>Print / save as PDF</Term> gives a clean copy without the menus.</p>
          {!adviser ? <Tip>You only ever see your own time. Fees and invoices are not shown to staff.</Tip> : null}
        </>
      ),
    },
    {
      id: "leave",
      title: "Requesting leave",
      audience: "everyone",
      body: (
        <>
          <p><Go href="/portal/leave">Leave</Go> is a calendar of who is away. Everyone can see it, so you know before booking a client meeting that a colleague is off that week.</p>
          <Steps>
            <li>Click the first day you&apos;ll be away, then the last day (one click for a single day).</li>
            <li>Choose the type: <Term>Annual</Term>, <Term>Sick</Term>, <Term>Bereavement</Term> or <Term>Parental</Term>. A single day can be a morning or afternoon half day. Add a note if it helps, and choose <Term>Send request</Term>.</li>
            <li>It shows on the calendar with a dashed edge while it waits. The advisers are emailed, and you&apos;re emailed when they decide. Once approved it turns solid and the days come off your balance.</li>
          </Steps>
          <Points>
            <li>Weekends and NZ public holidays are never counted, so a Friday-to-Monday request is two days.</li>
            <li>Your balance is beside the calendar. The standard allowance is {`20 days' annual leave and 10 days' sick leave`} a year, added on your start-date anniversary, but your own allowance may differ: an admin sets it per person. Unused annual leave carries over; sick leave carries over up to a cap of 20 days.</li>
            <li>You can <Term>withdraw</Term> a request while it&apos;s still waiting. Once approved, ask an adviser to cancel it.</li>
            <li>Other people&apos;s leave shows as &quot;away&quot;: only you and the advisers can see whether a day is annual or sick leave.</li>
          </Points>
        </>
      ),
    },
    {
      id: "statuses",
      title: "What each status means",
      audience: "everyone",
      body: (
        <>
          <h3 className="text-base font-semibold text-ink">Time entries</h3>
          <dl className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-[8rem_1fr]">
            <dt><span className="chip bg-surface-2 text-muted">Draft</span></dt><dd>Saved but not sent. Only counts once you submit it.</dd>
            <dt><span className="chip bg-accent-100 text-accent-600">Submitted</span></dt><dd>Waiting for an adviser to sign it off.</dd>
            <dt><span className="chip bg-bad-bg text-bad">Returned</span></dt><dd>Sent back to you with a note. Fix it and submit again.</dd>
            <dt><span className="chip bg-ok-bg text-ok">Approved</span></dt><dd>Signed off.</dd>
          </dl>
          <h3 className="mt-5 text-base font-semibold text-ink">Cases</h3>
          <dl className="mt-2 grid gap-x-6 gap-y-3 sm:grid-cols-[8rem_1fr]">
            <dt><span className="chip bg-surface-2 text-muted">Enquiry</span></dt><dd>A prospective client; not yet engaged.</dd>
            <dt><span className="chip bg-accent-100 text-accent-600">Active</span></dt><dd>Engaged and gathering documents or preparing the application.</dd>
            <dt><span className="chip bg-steel-100 text-steel">Lodged</span></dt><dd>Submitted to Immigration New Zealand or Home Affairs, awaiting a decision.</dd>
            <dt><span className="chip bg-ok-bg text-ok">Approved</span> <span className="chip bg-bad-bg text-bad">Declined</span></dt><dd>Decided, with the outcome.</dd>
            <dt><span className="chip bg-surface-2 text-muted">Closed</span></dt><dd>Finished. It drops out of the time-entry list but keeps its history.</dd>
          </dl>
        </>
      ),
    },

    // ------------------------------------------------------------ advisers
    {
      id: "opening-cases",
      title: "Opening and running a case",
      audience: "adviser",
      body: (
        <>
          <Steps>
            <li>On <Go href="/portal/cases">Cases</Go>, choose <Term>+ Open a case</Term>.</li>
            <li>Pick an existing client, or type a new client&apos;s name, email, phone and country.</li>
            <li>Choose the <Term>visa pathway</Term>. It sets the starting checklist (choose <Term>Other</Term> to build it yourself).</li>
            <li>Give it a short title, choose the responsible adviser and, if agreed, the fee. Choose <Term>Open case</Term>.</li>
          </Steps>
          <p className="mt-4">
            On the case, <Term>Case details</Term> on the right holds the status, lodgement and decision dates, the outcome and your notes. Move the status along as the matter progresses:
            Enquiry → Active → Lodged → Decided → Closed. <Term>My cases</Term> on the Cases list filters to the cases you&apos;re responsible for.
          </p>
          <Tip>A client can have several cases, for example a visitor visa now and residence later. Use <Term>Open another case</Term> on the client card.</Tip>
        </>
      ),
    },
    {
      id: "website-enquiries",
      title: "Enquiries from the website",
      audience: "adviser",
      body: (
        <>
          <p>
            Every consultation request sent from the website&apos;s form arrives in two places: as an email to info@ppimconsulting.co.nz, and here as a new
            case with the status <span className="chip bg-surface-2 text-muted">Enquiry</span> and a <span className="chip bg-accent-100 text-accent-600">Website</span> tag.
          </p>
          <Points>
            <li>The number beside <Go href="/portal/cases">Cases</Go> in the top bar is how many website enquiries nobody has picked up yet.</li>
            <li>The case notes hold the person&apos;s phone number, the visa they chose and their message. If they came from an ad, that is noted too.</li>
            <li>To pick one up, open it and choose yourself as the <Term>Adviser</Term> under Case details. It then drops off the count.</li>
            <li>If they engage you, move the status to <Term>Active</Term> and set the fee. If not, set it to <Term>Closed</Term>.</li>
            <li>Someone who has enquired before is matched by email, so their new enquiry is added to their existing client record.</li>
          </Points>
        </>
      ),
    },
    {
      id: "fees",
      title: "Fees and payment stages",
      audience: "adviser",
      body: (
        <>
          <p>Each case has an <Term>agreed fee</Term> (excluding GST) split into <Term>payment stages</Term>, for example:</p>
          <Points>
            <li>Deposit on signing the service agreement: 50%</li>
            <li>On lodgement: 40%</li>
            <li>On decision: 10%</li>
          </Points>
          <p className="mt-4">
            Set these under <Term>Fees &amp; payment stages</Term> on the case. The portal warns you if the stages don&apos;t add up to the agreed fee. A stage can be edited or removed until it has been invoiced;
            after that it shows its invoice number and is locked.
          </p>
          <p className="mt-3">
            The figures at the top compare the fee with the time spent: <Term>Fee per hour</Term> is the agreed fee divided by all submitted hours on the case. Fees and invoices are visible to advisers and admins only, never to staff.
          </p>
        </>
      ),
    },
    {
      id: "approvals",
      title: "Approving time",
      audience: "adviser",
      body: (
        <>
          <p><Go href="/portal/approvals">Approvals</Go> lists everything staff have submitted, grouped by person. The number beside it in the top bar is how many entries are waiting.</p>
          <Steps>
            <li>Everything starts ticked. Read down each person&apos;s entries: date, case, work type, task and hours.</li>
            <li>Untick anything you don&apos;t want to act on yet. The tick beside a person&apos;s name selects or clears all of theirs.</li>
            <li>Choose <Term>Approve selected</Term>.</li>
          </Steps>
          <p className="mt-4">
            To send something back instead, tick only those entries, type a <Term>note</Term> explaining what to fix (it&apos;s required), and choose <Term>Return selected</Term>.
            The person sees the note on their My day screen.
          </p>
        </>
      ),
    },
    {
      id: "all-entries",
      title: "Finding and correcting time",
      audience: "adviser",
      body: (
        <>
          <p><Go href="/portal/entries">All time</Go> is the full timesheet: every line from everyone, including drafts. Filter by date range, person, case or status; the totals above the table follow the filter. <Term>Download CSV</Term> saves the filtered list for Excel.</p>
          <Points>
            <li><Term>Edit</Term> at the right-hand end of each row opens an entry so you can correct the date, case, work type, hours or description.</li>
            <li><Term>+ Add an entry for someone</Term> is for when a person can&apos;t enter their own time. It goes into the Approvals queue like any other.</li>
            <li><Term>Delete</Term> at the bottom of an entry&apos;s Edit page removes it for good, after you tick the confirmation box.</li>
            {admin ? <li><Term>Deleting several at once</Term> (admins): tick the rows, or the box in the heading for everything the filter shows, then tick <Term>Yes, permanently delete</Term>. Filter first so you only see what you mean to remove.</li> : null}
          </Points>
          <Tip>Every edit and deletion is recorded with your name and the before and after values{admin ? <> in the <Go href="/portal/admin/audit">audit log</Go></> : " in the audit log"}.</Tip>
        </>
      ),
    },
    {
      id: "leave-approvals",
      title: "Approving leave",
      audience: "adviser",
      body: (
        <>
          <p>You&apos;re emailed when someone requests leave. New requests appear at the top of <Go href="/portal/leave">Leave</Go> (the number beside it in the top bar is how many are waiting). Each shows the dates, working days, the person&apos;s note and how much balance is left; a request that would take them over their allowance is flagged.</p>
          <Points>
            <li><Term>Approve</Term> books it. <Term>Decline</Term> needs a short reason, which the person sees.</li>
            <li><Term>Team balances</Term> lists everyone&apos;s annual and sick leave taken and remaining.</li>
            <li>Plans changed? Approved leave can be cancelled from the &quot;Approved leave around this month&quot; list, which puts the days back.</li>
          </Points>
        </>
      ),
    },
    {
      id: "reports",
      title: "Reports",
      audience: "adviser",
      body: (
        <>
          <p><Go href="/portal/reports">Reports</Go> each take a date range. <Term>Download CSV</Term> saves what&apos;s on screen and <Term>Print / save as PDF</Term> prints it without the menus. Drafts are never included.</p>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-[11rem_1fr]">
            <dt><Term>Hours check</Term></dt><dd>Short, over, full and leave days for everyone or one person, with overtime and totals. For everyone at once, keep the range to two months or less.</dd>
            <dt><Term>Time by person</Term></dt><dd>One person&apos;s time split by case, then line by line.</dd>
            <dt><Term>Time by case</Term></dt><dd>Hours per case split by work type. Pick one case to list every entry on it.</dd>
            <dt><Term>Case × person</Term></dt><dd>A grid of who spent how long on which case.</dd>
            <dt><Term>Case profitability</Term></dt><dd>For cases opened in the period: agreed fee, invoiced, paid, owing, total hours and fee per hour. The quickest way to see which kinds of case are priced right.</dd>
          </dl>
        </>
      ),
    },
    ...(!admin
      ? [{
          id: "invoices-view",
          title: "Invoices",
          audience: "adviser" as Audience,
          body: (
            <p>
              <Go href="/portal/invoices">Invoices</Go> shows fee stages that haven&apos;t been billed yet, and every invoice with its status
              (Issued, <span className="chip bg-warn-bg text-warn">Overdue</span>, Paid or Void). You can open and print any invoice. Raising, voiding and marking invoices paid is done by an admin.
            </p>
          ),
        }]
      : []),

    // ------------------------------------------------------------ admins
    {
      id: "invoicing",
      title: "Raising invoices",
      audience: "admin",
      body: (
        <>
          <p><Go href="/portal/invoices">Invoices</Go> opens with what is <Term>ready to bill</Term>: cases with fee stages that haven&apos;t been invoiced.</p>
          <Steps>
            <li>Choose <Term>Invoice →</Term> beside a case (or <Term>Invoice stages</Term> on the case itself, or <Term>+ New invoice</Term> and pick the case).</li>
            <li>Tick the stages to bill. Add an <Term>extra line</Term> if needed, such as an INZ application fee paid on the client&apos;s behalf.</li>
            <li>Set the invoice date and choose <Term>Create invoice</Term>. The number is assigned automatically, GST is added, and the due date follows your payment terms.</li>
            <li>Use <Term>Print / save as PDF</Term> on the invoice and email it to the client. When the money arrives, <Term>Mark as paid</Term> with the date.</li>
          </Steps>
          <Points>
            <li>An issued invoice past its due date shows as <span className="chip bg-warn-bg text-warn">Overdue</span>.</li>
            <li><Term>Made a mistake?</Term> <Term>Void</Term> the invoice. Its stages become billable again so you can correct them and invoice again. The voided number is never reused, which keeps your numbering clean for your accountant.</li>
          </Points>
          <Tip>Fill in your GST number, address and bank details under <Go href="/portal/admin/settings">Setup → Company &amp; GST</Go> before raising your first invoice; they print on every invoice.</Tip>
        </>
      ),
    },
    {
      id: "staff",
      title: "Adding and managing staff",
      audience: "admin",
      body: (
        <>
          <p>People can&apos;t sign themselves up. You add them under <Go href="/portal/admin/staff">Setup → Staff</Go>.</p>
          <Steps>
            <li>Enter their name, their email and a role.</li>
            <li>Choose <Term>Create account and get link</Term>.</li>
            <li>They&apos;re emailed a one-time link to choose their own password. The same link is shown on screen, so you can pass it on by text or WhatsApp if the email goes astray. It works once and expires after 24 hours.</li>
          </Steps>
          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-[7rem_1fr]">
            <dt><Term>Staff</Term></dt><dd>Works on cases and their checklists, enters their own time, and sees their own hours. Never sees fees, invoices or other people&apos;s time.</dd>
            <dt><Term>Adviser</Term></dt><dd>Everything staff can do, plus opens cases, sets fees and stages, sees all time and reports, and approves time and leave.</dd>
            <dt><Term>Admin</Term></dt><dd>Everything an adviser can do, plus Setup and raising invoices.</dd>
          </dl>
          <Points>
            <li>Open a person in the list to change their name, role or their own <Term>standard day</Term> (for part-timers; blank uses the company default).</li>
            <li><Term>Someone has left:</Term> untick <Term>Active</Term>. They can no longer sign in, and all their past time stays intact. Accounts are never deleted.</li>
            <li><Term>Lost invite or locked out:</Term> <Term>Get a new sign-in link</Term> sends them a fresh one-time link (and shows it to you).</li>
          </Points>
          <Tip>You can&apos;t remove your own admin access or deactivate yourself, so the portal can never be left without an admin.</Tip>
        </>
      ),
    },
    {
      id: "leave-allowances",
      title: "Setting leave allowances",
      audience: "admin",
      body: (
        <>
          <p>The <Term>Leave allowances</Term> table at the top of <Go href="/portal/admin/staff">Setup → Staff</Go> shows everyone&apos;s allowance at a glance; <Term>default</Term> means the company-wide figure set under <Go href="/portal/admin/settings">Company &amp; GST</Go> (starting at the NZ minimums of 20 days annual and 10 days sick, with a sick-leave cap of 20).</p>
          <Steps>
            <li>Open a person&apos;s row and enter their <Term>Start date</Term>. Their leave year runs from this anniversary.</li>
            <li>Enter their own <Term>Annual</Term> and <Term>Sick</Term> days per year, or leave blank for the default.</li>
            <li>Had leave built up before the portal? Enter it under <Term>Opening leave balances</Term> with the date it was correct.</li>
          </Steps>
        </>
      ),
    },
    {
      id: "setup",
      title: "Clients, work types, holidays and company details",
      audience: "admin",
      body: (
        <Points>
          <li><Go href="/portal/admin/clients">Clients</Go>: name, email, phone, country and notes. The name and contact details print as &quot;Bill to&quot; on invoices.</li>
          <li><Go href="/portal/admin/work-types">Work types</Go>: add, rename and reorder them. Untick <Term>Active</Term> to retire one without touching old entries.</li>
          <li><Go href="/portal/admin/holidays">Public holidays</Go>: NZ holidays are loaded through 2028. Add an office closure day here too, so nobody is marked short for it.</li>
          <li><Go href="/portal/admin/settings">Company &amp; GST</Go>: the invoice letterhead (legal and trading name, GST number, address, contact line, bank details), the GST rate, the standard day, invoice and case numbering, payment terms and leave defaults.</li>
        </Points>
      ),
    },
    {
      id: "audit",
      title: "The audit log",
      audience: "admin",
      body: (
        <p>
          <Go href="/portal/admin/audit">Setup → Audit log</Go> records every change to cases, checklists, fees, time entries, invoices, staff and settings: who made it, when, and the value before and after.
          Nothing in the log can be edited or removed.
        </p>
      ),
    },
  ];

  const visible = sections.filter((s) => s.audience === "everyone" || (s.audience === "adviser" && adviser) || (s.audience === "admin" && admin));
  const groups = (["everyone", "adviser", "admin"] as Audience[])
    .map((a) => ({ audience: a, items: visible.filter((s) => s.audience === a) }))
    .filter((g) => g.items.length > 0);
  const roleName = admin ? "an admin" : adviser ? "an adviser" : "a staff member";

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      <nav aria-label="Guide contents" className="lg:sticky lg:top-6 lg:w-60 lg:shrink-0">
        <details className="group rounded-xl border border-line bg-surface lg:contents">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-ink lg:hidden">
            In this guide <span className="float-right text-muted group-open:hidden">Show</span><span className="float-right hidden text-muted group-open:inline">Hide</span>
          </summary>
          <div className="px-4 pb-4 lg:contents">
            <h2 className="hidden text-xs font-semibold tracking-wide text-muted uppercase lg:block">In this guide</h2>
            {groups.map((g) => (
              <div key={g.audience} className="mt-4">
                {groups.length > 1 ? <p className="mb-1 text-[13px] font-semibold text-ink">{AUDIENCE_LABEL[g.audience]}</p> : null}
                <ul className="flex flex-col border-l border-line">
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-2 pl-3 text-sm text-muted hover:border-ink hover:text-ink lg:py-1">{s.title}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </nav>

      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-semibold">How to use the portal</h1>
        <p className="mt-2 max-w-[65ch] text-muted">
          You&apos;re signed in as {roleName}, so this guide covers what you can do{adviser ? ", from entering your own time through to the tools only your role has" : ""}.
        </p>

        <div className="mt-8 flex flex-col gap-10">
          {visible.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="max-w-[70ch] scroll-mt-6 text-[15px] leading-relaxed text-text">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 id={`${s.id}-title`} className="text-xl font-semibold">{s.title}</h2>
                {groups.length > 1 ? <span className={`chip ${AUDIENCE_CHIP[s.audience]}`}>{AUDIENCE_LABEL[s.audience]}</span> : null}
              </div>
              <div className="mt-3">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-12 max-w-[70ch] border-t border-line pt-5 text-sm text-muted">
          Something not working, or not covered here? {admin ? "Contact BedRock IT: info@bedrock-it.co.nz or 021 0235 5670." : "Talk to Priya first. For technical problems the portal is supported by BedRock IT."}
        </p>
      </div>
    </div>
  );
}
