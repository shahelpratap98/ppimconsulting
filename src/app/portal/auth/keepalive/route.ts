import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/portal/supabase/admin";

// Free Supabase projects are paused after about a week with no activity (a
// Christmas shutdown would do it), and the portal then errors until someone
// restores the project by hand. Vercel Cron calls this once a day (see
// "crons" in vercel.json) and it runs one real database query, which counts
// as activity. Remove the cron once the project is on Supabase Pro.
//
// If CRON_SECRET is set in Vercel, only Vercel's cron (which sends it as a
// bearer token) may call this. Without it the endpoint is open, which is
// harmless: one tiny read, behind the portal's per-IP rate limit.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set, so no database query was made" }, { status: 500 });
  }

  const started = Date.now();
  const { data, error } = await admin.from("settings").select("company_name").limit(1).maybeSingle();
  if (error || !data) {
    console.error("[keepalive]", error?.message ?? "settings row missing");
    return NextResponse.json({ ok: false, error: error?.message ?? "settings row missing" }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, at: new Date().toISOString(), queryMs: Date.now() - started },
    { headers: { "Cache-Control": "no-store" } },
  );
}
