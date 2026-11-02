import { NextResponse, type NextRequest } from "next/server";
import { services } from "@/lib/data";
import { clientIp, rateLimit } from "@/lib/portal/rate-limit";
import { createAdminClient } from "@/lib/portal/supabase/admin";

// The consultation form posts here as well as to FormSubmit (which emails
// info@). Each enquiry lands on the Enquiries page in the staff portal, so it
// is never lost in an inbox. It becomes a client and a case when they sign.

// Website service slug → portal pathway (which sets the checklist at sign-up).
const PATHWAY_FOR_SERVICE: Record<string, { pathway: string; jurisdiction: "NZ" | "AU" }> = {
  "skilled-migrant-visa": { pathway: "smc", jurisdiction: "NZ" },
  "work-visa": { pathway: "aewv", jurisdiction: "NZ" },
  "student-visa": { pathway: "student", jurisdiction: "NZ" },
  "visitor-visa": { pathway: "visitor", jurisdiction: "NZ" },
  "partner-family-visa": { pathway: "partnership", jurisdiction: "NZ" },
  "business-investor-visa": { pathway: "business", jurisdiction: "NZ" },
  "australian-visa": { pathway: "other", jurisdiction: "AU" },
};

const AD_FIELDS = ["gclid", "gbraid", "wbraid", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "landing_page"];

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
  const serviceName = services.find((s) => s.slug === service)?.shortName ?? (service === "australian-visa" ? "Australian visa" : "Not sure yet");

  // Ad click IDs and UTM tags, when the visitor arrived from an ad.
  const attribution = body.attribution && typeof body.attribution === "object" ? (body.attribution as Record<string, unknown>) : {};
  const adFields = Object.fromEntries(AD_FIELDS.map((k) => [k, str(attribution[k], 200)]));

  const { error } = await admin.rpc("crm_website_enquiry", {
    p: {
      name,
      email,
      phone,
      service: serviceName,
      message,
      pathway: target.pathway,
      jurisdiction: target.jurisdiction,
      title: `Website enquiry: ${serviceName}`,
      ...adFields,
    },
  });
  if (error) {
    console.error("[enquiry] could not save:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
