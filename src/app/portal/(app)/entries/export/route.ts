import { NextResponse, type NextRequest } from "next/server";
import { isAdviser } from "@/lib/portal/auth";
import { csvResponse, toCsv } from "@/lib/portal/csv";
import { fetchEntryRows, parseEntryFilters } from "@/lib/portal/entry-filters";
import { rateLimit } from "@/lib/portal/rate-limit";
import { createClient } from "@/lib/portal/supabase/server";

const MAX_EXPORT_ROWS = 20_000;
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The All time grid as a CSV file, with the same filters.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Sign in first.", { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("user_id", user.id).maybeSingle();
  if (!profile?.is_active || !isAdviser(profile.role)) return new NextResponse("Not allowed.", { status: 403 });

  const limit = await rateLimit("downloads", user.id);
  if (!limit.ok) {
    return new NextResponse("Too many downloads. Wait a few minutes and try again.", { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  const f = parseEntryFilters((name) => request.nextUrl.searchParams.get(name));
  const { rows, error } = await fetchEntryRows(supabase, f, MAX_EXPORT_ROWS);
  if (error) return new NextResponse("Couldn't load entries: " + error, { status: 500 });

  const csv = toCsv(
    ["Date", "Person", "Case No", "Client", "Case", "Work Type", "Hours", "Task Description", "Status", "Approved By"],
    rows.map((r) => [
      r.entry_date,
      r.employee,
      r.case_no,
      r.client,
      r.case_title,
      r.work_type,
      Number(r.hours ?? 0),
      r.description,
      title(r.status),
      r.approved_by_name,
    ]),
  );
  return csvResponse(csv, `ppim-time-${f.from}-to-${f.to}.csv`);
}
