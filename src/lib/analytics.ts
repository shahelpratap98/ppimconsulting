// Ad and analytics tracking. Every helper is a no-op until its ID is set in
// the environment, so the site behaves exactly as before without them.

// IDs are interpolated into inline scripts, so anything that isn't a plain
// tag ID is dropped rather than trusted.
const tagId = (value: string | undefined) =>
  value && /^[A-Za-z0-9_-]+$/.test(value) ? value : "";

export const GA_ID = tagId(process.env.NEXT_PUBLIC_GA_ID); // G-XXXXXXXXXX
export const GOOGLE_ADS_ID = tagId(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID); // AW-XXXXXXXXX
const GOOGLE_ADS_LEAD_LABEL = tagId(process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL);
export const META_PIXEL_ID = tagId(process.env.NEXT_PUBLIC_META_PIXEL_ID);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) window.gtag(...args);
}

function fbq(...args: unknown[]) {
  if (typeof window !== "undefined" && window.fbq) window.fbq(...args);
}

// Only the visa pathway category goes to Google Analytics. Names, emails,
// phone numbers and messages never leave the enquiry email, and nothing about
// the enquiry's content is sent to Meta.
export function trackLead(visaPathway: string) {
  gtag("event", "generate_lead", { visa_pathway: visaPathway || "not-sure" });
  if (GOOGLE_ADS_ID && GOOGLE_ADS_LEAD_LABEL) {
    gtag("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LEAD_LABEL}` });
  }
  fbq("track", "Lead");
}

export function trackContactClick(method: "whatsapp" | "phone") {
  gtag("event", method === "whatsapp" ? "whatsapp_click" : "phone_click");
  fbq("track", "Contact", { content_name: method });
}

export function trackMetaPageView() {
  fbq("track", "PageView");
}

// --- Ad click attribution -------------------------------------------------
// Click IDs and UTM tags from the landing URL are kept in this browser for
// 90 days and sent with the enquiry, so each lead can be matched back to the
// ad that produced it (offline conversion import).

const ATTRIBUTION_KEY = "ppim_attribution";
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const ATTRIBUTION_PARAMS = [
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

type Attribution = Partial<Record<(typeof ATTRIBUTION_PARAMS)[number], string>> & {
  landing_page?: string;
  captured_at?: number;
};

export function captureAttribution() {
  const params = new URLSearchParams(window.location.search);
  const found: Attribution = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = params.get(key);
    if (value) found[key] = value.slice(0, 200);
  }
  // A new ad click replaces the previous one; a plain visit keeps it.
  if (Object.keys(found).length === 0) return;
  found.landing_page = window.location.pathname;
  found.captured_at = Date.now();
  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(found));
  } catch {
    // Storage blocked (private mode etc.) — attribution is best-effort.
  }
}

export function getAttribution(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return {};
    const { captured_at, ...fields } = JSON.parse(raw) as Attribution;
    if (!captured_at || Date.now() - captured_at > ATTRIBUTION_TTL_MS) {
      localStorage.removeItem(ATTRIBUTION_KEY);
      return {};
    }
    return Object.fromEntries(
      Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    );
  } catch {
    return {};
  }
}
