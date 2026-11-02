import { after } from "next/server";
import { mailConfigured, runSync } from "@/lib/portal/mail-sync";

// Microsoft Graph calls this when a message lands in the mailbox. It wants an
// answer within a few seconds, so this replies 202 at once and syncs afterwards.
// The notification is only a nudge: nothing in it is trusted beyond the
// clientState check, and the sync reads the mailbox itself.
export async function POST(request: Request) {
  // Subscription handshake: echo the token back as plain text.
  const token = new URL(request.url).searchParams.get("validationToken");
  if (token) return new Response(token, { status: 200, headers: { "content-type": "text/plain" } });

  if (!mailConfigured().ok) return new Response(null, { status: 202 });

  let body: { value?: { clientState?: string }[] } = {};
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const genuine = (body.value ?? []).some((n) => n.clientState === process.env.GRAPH_CLIENT_STATE);
  if (!genuine) return new Response(null, { status: 403 });

  after(() => runSync());
  return new Response(null, { status: 202 });
}
