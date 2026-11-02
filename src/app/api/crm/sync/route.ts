import { NextResponse, type NextRequest } from "next/server";
import { mailConfigured, runSync } from "@/lib/portal/mail-sync";

// Vercel Cron calls this daily (see vercel.json): a catch-up, and it renews the
// Graph subscription before it lapses. Unlike the keepalive this reads client
// mail, so it stays shut unless CRON_SECRET is set and sent.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  const config = mailConfigured();
  if (!config.ok) return NextResponse.json({ ok: false, error: "not_configured", missing: config.missing }, { status: 501 });
  const result = await runSync();
  return NextResponse.json(result, { status: result.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } });
}
