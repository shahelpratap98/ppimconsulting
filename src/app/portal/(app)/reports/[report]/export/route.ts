import { NextResponse, type NextRequest } from "next/server";
import { isAdviser } from "@/lib/portal/auth";
import { csvResponse, toCsv } from "@/lib/portal/csv";
import { findReport, parseReportParams } from "@/lib/portal/report-params";
import { buildReport, reportToRows } from "@/lib/portal/reports";
import { rateLimit } from "@/lib/portal/rate-limit";
import { createClient } from "@/lib/portal/supabase/server";
import type { Profile } from "@/lib/portal/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ report: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sign in first.", { status: 401 });

  const limit = await rateLimit("downloads", user.id);
  if (!limit.ok) {
    return new NextResponse("Too many downloads. Wait a few minutes and try again.", { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, display_name, email, role, standard_day_hours, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.is_active) return new NextResponse("Account inactive.", { status: 403 });

  const { report: slug } = await params;
  const def = findReport(slug);
  if (!def) return new NextResponse("Unknown report.", { status: 404 });
  if (def.adviserOnly && !isAdviser(profile.role)) return new NextResponse("Not allowed.", { status: 403 });

  const p = parseReportParams(def.slug, (name) => request.nextUrl.searchParams.get(name), profile as Profile);
  const [first, ...rest] = reportToRows(await buildReport(def.slug, supabase, p));

  return csvResponse(toCsv(first.map(String), rest), `ppim-${def.slug}-${p.from}-to-${p.to}.csv`);
}
