import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { hitMemory, ipFrom, type LimitResult } from "@/lib/portal/rate-limit-memory";
import { createAdminClient } from "@/lib/portal/supabase/admin";

// Named limits, in one place so they are easy to review and tune.
// [max hits, window in seconds]
export const LIMITS = {
  signInPerEmail: [5, 15 * 60],
  signInPerIp: [20, 15 * 60],
  resetPerEmail: [3, 60 * 60],
  resetPerIp: [10, 60 * 60],
  passwordChange: [10, 60 * 60],
  staffLinks: [30, 60 * 60], // invites + one-time sign-in links, per admin
  downloads: [30, 5 * 60], // CSV exports, per person
  saves: [120, 5 * 60], // My day saves, per person
  bulkActions: [60, 5 * 60], // approve / return / invoice actions, per person
  emails: [20, 60 * 60], // invoice emails, per admin
} as const satisfies Record<string, readonly [number, number]>;

export type LimitName = keyof typeof LIMITS;

// Identifiers (emails, IPs) are hashed before they are stored or sent anywhere.
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

// Counts a hit against `name` for `who`. Shared across every server instance
// through the database (public.rate_limit_hit); if the service key is missing
// or the database is unreachable it falls back to this instance's memory, so a
// database problem can never lock everyone out.
export async function rateLimit(name: LimitName, who: string): Promise<LimitResult> {
  const [limit, windowSeconds] = LIMITS[name];
  const key = `${name}:${hash(who.toLowerCase())}`;

  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin.rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (!error && typeof data === "boolean") return { ok: data, retryAfter: windowSeconds };
    if (error) console.error("[rate-limit] falling back to memory:", error.message);
  }
  return hitMemory(key, limit, windowSeconds);
}

export async function clientIp(): Promise<string> {
  return ipFrom(await headers());
}

export function waitMessage(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "Wait a minute and try again." : `Wait about ${minutes} minutes and try again.`;
}
