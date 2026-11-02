# PPIM CRM

The enquiry side of the staff portal, adapted from the BedRock CRM for an
immigration practice. It lives inside the portal at
**https://www.ppimconsulting.co.nz/portal/enquiries**, so Priya and staff use
one login, and enquiries become clients and cases without retyping.

- **Website enquiries** appear on Enquiries automatically, with the ad and page
  they came from.
- **Calls, WhatsApps and walk-ins** are added with **+ Add enquiry**.
- **Emails to info@** (once connected, below) land in **Inbox** until someone
  makes them an enquiry or ignores the sender. Existing clients skip the Inbox.
- **Replies sent from info@** move an enquiry from New to Contacted.
- **Signing up a client** opens an active case with the pathway's document
  checklist, the quoted fee and their visa expiry as a deadline.
- **Deadlines** lists visa expiries, responses due and certificates running out.
- **Reports → Enquiries** shows enquiries, consultations and sign-ups by source,
  pathway and office.

## Who can do what

| | Staff | Adviser | Admin |
| --- | --- | --- | --- |
| See and work enquiries, notes, messages, deadlines | Yes | Yes | Yes |
| See fees, record the eligibility assessment | Read-only assessment, no fees | Yes | Yes |
| Sign up a client (opens the case) | No | Yes | Yes |
| Enquiries report | No | Yes | Yes |
| Delete an enquiry | No | No | Yes |

The database enforces these rules, not just the screens. Assessing eligibility
is immigration advice, so staff cannot write it. Message templates are
administrative only, for the same reason: Priya should review their wording.

## How it fits together

| Piece | Where |
| --- | --- |
| Tables, permissions, all pipeline rules | `supabase/migrations/20261101000900_crm.sql` |
| Stages, labels, message templates | `src/lib/portal/crm.ts` |
| Screens | `src/app/portal/(app)/enquiries`, `src/app/portal/(app)/deadlines` |
| Website form | `src/app/api/enquiry/route.ts` → `crm_website_enquiry()` |
| Mailbox sync | `src/lib/portal/mail-sync.ts`, `src/app/api/crm/notify`, `src/app/api/crm/sync` |

The order matters when releasing: run the migration **before** deploying the
code. The form succeeds if either the email or the portal save works, so an
enquiry is not lost during the gap, but it would only reach the inbox.

Website enquiries from before the CRM were filed as cases and stay under Cases.

## Connecting the info@ mailbox

Optional. Everything else works without it, and the Inbox page says so until
it is done. It needs a Microsoft 365 **Global Administrator**.

The tenant (Smart Renovations Ltd) is shared with BedRock IT, so the app must be
limited to one mailbox. Do **not** add a Microsoft Graph `Mail.Read` permission
under API permissions: that would let it read every mailbox in the organisation.

1. **Register the app.** In https://entra.microsoft.com → Applications → App
   registrations → **New registration**, name it `PPIM CRM mail sync`, choose
   single tenant, and leave the redirect URI blank.
2. **Copy** the Application (client) ID and the Directory (tenant) ID.
3. **Create a secret.** Under Certificates & secrets, choose 24 months, copy the
   **Value** straight away and put its expiry in a calendar.
4. **Limit it to info@.** In PowerShell, as the admin:

   ```powershell
   Connect-ExchangeOnline

   # The Object ID is under Entra → Enterprise applications → PPIM CRM mail sync
   # → Overview. It is NOT the ID on the App registrations page.
   New-ServicePrincipal -AppId <Application (client) ID> -ObjectId <Enterprise app Object ID> -DisplayName "PPIM CRM mail sync"

   New-ManagementScope -Name "PPIM CRM mailbox only" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'info@ppimconsulting.co.nz'"

   New-ManagementRoleAssignment -App <Application (client) ID> -Role "Application Mail.Read" -CustomResourceScope "PPIM CRM mailbox only"

   # InScope should be True for info@ and False for any other mailbox:
   Test-ServicePrincipalAuthorization -Identity <Application (client) ID> -Resource info@ppimconsulting.co.nz
   Test-ServicePrincipalAuthorization -Identity <Application (client) ID> -Resource priya_pratap@ppimconsulting.co.nz
   ```

   Permission changes can take up to an hour to apply.
5. **Add these in Vercel** (Settings → Environment Variables, Production):

   | Name | Value |
   | --- | --- |
   | `MS_TENANT_ID` | Directory (tenant) ID |
   | `MS_CLIENT_ID` | Application (client) ID |
   | `MS_CLIENT_SECRET` | the secret value |
   | `CRM_MAILBOX` | `info@ppimconsulting.co.nz` |
   | `GRAPH_CLIENT_STATE` | any long random string |
   | `CRON_SECRET` | any long random string |

6. **Redeploy**, then press **Check mail now** on the Inbox page. It reads the
   last 90 days. Microsoft then notifies the portal within seconds of new mail,
   and a daily job catches anything missed.
7. **Update the privacy policy** before switching this on: emails to info@ are
   then copied into the secure client records system in Sydney. Attachments are
   not copied; only a note that there was one.

## Testing

Pipeline rules are tested in PGlite against the real migrations. The mail sync
was tested against a fake Microsoft server: newsletters, drafts, deleted mail
and the form's email copy are skipped, retries are harmless, and forged
notifications are refused.
