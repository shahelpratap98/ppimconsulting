import { NextResponse, type NextRequest } from "next/server";
import { services } from "@/lib/data";
import { pathwayByKey } from "@/lib/portal/pathways";
import { clientIp, rateLimit } from "@/lib/portal/rate-limit";
import { createAdminClient } from "@/lib/portal/supabase/admin";

// The consultation form posts here as well as to FormSubmit (which emails
// info@). Each enquiry is filed in the staff portal as a client and a case
// with status "Enquiry", so an enquiry is never lost in an inbox.

// Website service slug → portal pathway (which sets the starting checklist).
const PATHWAY_FOR_SERVICE: Record<string, { pathway: string; jurisdiction: "NZ" | "AU" }> = {
  "skilled-migrant-visa": { pathway: "smc", jurisdiction: "NZ" },
  "work-visa": { pathway: "aewv", jurisdiction: "NZ" },
  "student-visa": { pathway: "student", jurisdiction: "NZ" },
  "visitor-visa": { pathway: "visitor", jurisdiction: "NZ" },
  "partner-family-visa": { pathway: "partnership", jurisdiction: "NZ" },
  "business-investor-visa": { pathway: "business", jurisdiction: "NZ" },
  "australian-visa": { pathway: "other", jurisdiction: "AU" },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function sameOrigin(request: NextRequest): boolean {
  try {
    return new URL(request.headers.get("origin") ?? "").host === request.nextUrl.host;
  } catch {
    return false;
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  // Only the site's own pages may post here.
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Honeypot: people never see this field, so anything in it is a bot. Answer
  // as if it worked so the bot learns nothing.
  if (str(body.company, 200)) return NextResponse.json({ ok: true });

  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const phone = str(body.phone, 40);
  const service = str(body.service, 60);
  const message = str(body.message, 5000);
  if (!name || !EMAIL.test(email)) return NextResponse.json({ ok: false }, { status: 400 });

  const limit = await rateLimit("enquiries", await clientIp());
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });

  const admin = createAdminClient();
  if (!admin) {
    console.error("[enquiry] SUPABASE_SERVICE_ROLE_KEY is not set; enquiry not saved to the portal");
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const target = PATHWAY_FOR_SERVICE[service] ?? { pathway: "other", jurisdiction: "NZ" as const };
  const pathway = pathwayByKey(target.pathway);
  const serviceName = services.find((s) => s.slug === service)?.shortName ?? (service === "australian-visa" ? "Australian visa" : "Not sure yet");

  // Ad click IDs and UTM tags, when the visitor arrived from an ad.
  const attribution = body.attribution && typeof body.attribution === "object" ? (body.attribution as Record<string, unknown>) : {};
  const cameFrom = Object.entries(attribution)
    .filter(([k, v]) => /^[a-z_]{2,30}$/.test(k) && typeof v === "string")
    .slice(0, 12)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 200)}`);

  const received = new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Pacific/Auckland" }).format(new Date());
  const notes = [
    `Website enquiry received ${received}.`,
    `Phone: ${phone || "not given"}`,
    `Visa pathway chosen: ${serviceName}`,
    "",
    "Message:",
    message || "(none)",
    ...(cameFrom.length ? ["", "Came from an ad:", ...cameFrom] : []),
  ].join("\n");

  const { error } = await admin.rpc("create_website_enquiry", {
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_pathway: target.pathway,
    p_jurisdiction: target.jurisdiction,
    p_title: `Website enquiry: ${serviceName}`,
    p_notes: notes,
    p_checklist: pathway?.items ?? [],
  });
  if (error) {
    console.error("[enquiry] could not save:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
