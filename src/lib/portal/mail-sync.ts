import "server-only";
import { APP_URL } from "@/lib/portal/paths";
import { createAdminClient } from "@/lib/portal/supabase/admin";

// Reads the info@ mailbox through Microsoft Graph and hands each new email to
// crm_ingest() in the database, which decides what it means.
//
// Runs from three places:
//   /api/crm/notify  when Graph says a message arrived (seconds after it lands)
//   /api/crm/sync    once a day from Vercel cron, as a catch-up and to keep the
//                    Graph subscription alive
//   "Check mail now" on the Enquiries inbox page
//
// Every step is idempotent: a message already stored is skipped by its Graph
// id, so overlapping runs and retried notifications are harmless.
//
// Environment: MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET (Entra app),
// CRM_MAILBOX (info@ppimconsulting.co.nz), GRAPH_CLIENT_STATE (random secret
// Graph echoes back), CRON_SECRET. See CRM.md for the setup.

const env = (key: string) => process.env[key] ?? "";

// Overridable for local testing against fakes; never set in production.
const GRAPH = env("GRAPH_BASE") || "https://graph.microsoft.com/v1.0";
const LOGIN = env("MS_LOGIN_BASE") || "https://login.microsoftonline.com";

const OWN_DOMAINS = ["ppimconsulting.co.nz", "priyaimmigration.co.nz"];
const BACKFILL_DAYS = 90;
const TIME_BUDGET_MS = 240_000;
// Graph caps mail subscriptions at 4,230 minutes; renew well before that.
const SUBSCRIPTION_MINUTES = 4_200;
const RENEW_WITHIN_MS = 30 * 3600_000;

export function mailConfigured() {
  const missing = ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "CRM_MAILBOX", "GRAPH_CLIENT_STATE", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !env(key));
  return { ok: missing.length === 0, missing };
}

type SyncState = {
  inbox_delta: string | null;
  sent_delta: string | null;
  subscription_id: string | null;
  subscription_expires: string | null;
  messages_seen: number;
};

function db() {
  const admin = createAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return admin;
}

async function getState(): Promise<SyncState> {
  const { data, error } = await db().from("mail_sync").select("*").eq("id", true).single();
  if (error) throw new Error("Reading sync state failed: " + error.message);
  return data as SyncState;
}

async function setState(patch: Record<string, unknown>) {
  const { error } = await db().from("mail_sync").update(patch).eq("id", true);
  if (error) throw new Error("Saving sync state failed: " + error.message);
}

// ------------------------------------------------------------------ Microsoft Graph

let cachedToken: { value: string; expires: number } | null = null;

async function graphToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`${LOGIN}/${env("MS_TENANT_ID")}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("MS_CLIENT_ID"),
      client_secret: env("MS_CLIENT_SECRET"),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Microsoft sign-in failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

async function graph(url: string, init: RequestInit = {}) {
  const full = url.startsWith("http") ? url : `${GRAPH}${url}`;
  return fetch(full, {
    ...init,
    headers: {
      authorization: `Bearer ${await graphToken()}`,
      "content-type": "application/json",
      prefer: 'outlook.body-content-type="text", odata.maxpagesize=50',
      ...(init.headers ?? {}),
    },
  });
}

type Address = { emailAddress?: { address?: string; name?: string } };

export type GraphMessage = {
  id: string;
  "@removed"?: unknown;
  subject?: string;
  from?: Address;
  toRecipients?: Address[];
  ccRecipients?: Address[];
  receivedDateTime?: string;
  sentDateTime?: string;
  bodyPreview?: string;
  body?: { content?: string };
  conversationId?: string;
  internetMessageId?: string;
  hasAttachments?: boolean;
  isDraft?: boolean;
};

const SELECT = [
  "subject", "from", "toRecipients", "ccRecipients", "receivedDateTime", "sentDateTime", "bodyPreview",
  "body", "conversationId", "internetMessageId", "hasAttachments", "isDraft",
].join(",");

// ------------------------------------------------------------------ one email

const AUTOMATED_SENDER = /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster|bounces?|notifications?|alerts?|newsletters?)([+.\-_].*)?@/i;
// The website form's email copy. /api/enquiry has already filed the enquiry.
const FORM_RELAY = /@(.*\.)?formsubmit\.co$/i;

// Newsletters, receipts and system mail. Deliberately narrow: a real person
// who lands in the inbox costs a click; one silently dropped costs a client.
export function looksAutomated(fromEmail: string, body: string) {
  return AUTOMATED_SENDER.test(fromEmail) || FORM_RELAY.test(fromEmail) || /\bunsubscribe\b/i.test(body);
}

const addr = (a?: Address) => (a?.emailAddress?.address ?? "").toLowerCase();

export function toIngest(m: GraphMessage, direction: "in" | "out") {
  const body = m.body?.content ?? "";
  const fromEmail = addr(m.from);
  return {
    graph_id: m.id,
    direction,
    from_email: fromEmail,
    from_name: m.from?.emailAddress?.name ?? null,
    to_emails: [...(m.toRecipients ?? []), ...(m.ccRecipients ?? [])].map(addr).filter(Boolean),
    subject: m.subject ?? "",
    preview: m.bodyPreview ?? "",
    body_text: body,
    received_at: (direction === "out" ? m.sentDateTime : m.receivedDateTime) ?? m.receivedDateTime ?? new Date().toISOString(),
    conversation_id: m.conversationId ?? null,
    internet_message_id: m.internetMessageId ?? null,
    has_attachments: Boolean(m.hasAttachments),
    automated: direction === "in" && looksAutomated(fromEmail, body),
  };
}

// ------------------------------------------------------------------ the sync

async function ensureSubscription(state: SyncState) {
  const expires = state.subscription_expires ? Date.parse(state.subscription_expires) : 0;
  if (state.subscription_id && expires - Date.now() > RENEW_WITHIN_MS) return;
  const expirationDateTime = new Date(Date.now() + SUBSCRIPTION_MINUTES * 60_000).toISOString();

  if (state.subscription_id) {
    const res = await graph(`/subscriptions/${state.subscription_id}`, { method: "PATCH", body: JSON.stringify({ expirationDateTime }) });
    if (res.ok) {
      await setState({ subscription_expires: expirationDateTime });
      return;
    }
  }
  const res = await graph("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      changeType: "created",
      notificationUrl: `${APP_URL.replace(/\/$/, "")}/api/crm/notify`,
      resource: `/users/${env("CRM_MAILBOX")}/messages`,
      expirationDateTime,
      clientState: env("GRAPH_CLIENT_STATE"),
    }),
  });
  if (!res.ok) throw new Error(`Could not subscribe to the mailbox: ${res.status} ${await res.text()}`);
  const sub = (await res.json()) as { id: string; expirationDateTime: string };
  await setState({ subscription_id: sub.id, subscription_expires: sub.expirationDateTime });
}

type FolderResult = { cursor: string | null; seen: number; outcomes: Record<string, number>; finished: boolean };

async function syncFolder(folder: "inbox" | "sentitems", cursor: string | null, deadline: number): Promise<FolderResult> {
  const direction = folder === "inbox" ? "in" : "out";
  const since = new Date(Date.now() - BACKFILL_DAYS * 86400_000).toISOString();
  const base = `/users/${encodeURIComponent(env("CRM_MAILBOX"))}/mailFolders/${folder}/messages/delta`;
  let url = cursor ?? `${base}?$select=${SELECT}&$filter=receivedDateTime+ge+${since}`;
  const outcomes: Record<string, number> = {};
  let seen = 0;

  for (;;) {
    let res = await graph(url);
    // Some tenants refuse $filter on the first delta call; fall back to the
    // whole folder and skip old mail ourselves.
    if (res.status === 400 && !cursor && url.includes("$filter")) {
      url = `${base}?$select=${SELECT}`;
      res = await graph(url);
    }
    // An expired cursor means start again; stored messages are skipped by id.
    if (res.status === 410 && cursor) return syncFolder(folder, null, deadline);
    if (!res.ok) throw new Error(`Reading ${folder} failed: ${res.status} ${await res.text()}`);

    const page = (await res.json()) as { value: GraphMessage[]; "@odata.nextLink"?: string; "@odata.deltaLink"?: string };
    for (const m of page.value) {
      if (m["@removed"] || m.isDraft) continue;
      if ((m.receivedDateTime ?? m.sentDateTime ?? "") < since) continue;
      const { data, error } = await db().rpc("crm_ingest", { p: toIngest(m, direction), p_own_domains: OWN_DOMAINS });
      if (error) throw new Error("Saving an email failed: " + error.message);
      const kind = String(data).split(":")[0];
      outcomes[kind] = (outcomes[kind] ?? 0) + 1;
      seen++;
    }

    const next = page["@odata.nextLink"];
    if (next) {
      url = next;
      // Out of time: keep the place and carry on next run.
      if (Date.now() > deadline) return { cursor: next, seen, outcomes, finished: false };
      continue;
    }
    return { cursor: page["@odata.deltaLink"] ?? cursor, seen, outcomes, finished: true };
  }
}

export async function runSync() {
  const started = Date.now();
  const deadline = started + TIME_BUDGET_MS;
  try {
    await setState({ last_run_at: new Date(started).toISOString(), mailbox: env("CRM_MAILBOX") });
    const state = await getState();
    await ensureSubscription(state);
    const inbox = await syncFolder("inbox", state.inbox_delta, deadline);
    await setState({ inbox_delta: inbox.cursor });
    const sent = await syncFolder("sentitems", state.sent_delta, deadline);
    await setState({
      sent_delta: sent.cursor,
      last_ok_at: new Date().toISOString(),
      last_error: null,
      messages_seen: (state.messages_seen ?? 0) + inbox.seen + sent.seen,
    });
    return { ok: true as const, inbox: inbox.seen, sent: sent.seen, ms: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setState({ last_error: message.slice(0, 1000) }).catch(() => {});
    return { ok: false as const, error: message };
  }
}
