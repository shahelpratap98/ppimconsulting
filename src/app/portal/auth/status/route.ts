import { NextResponse } from "next/server";

// Which database and which Vercel region this deployment is actually using.
// Handy after changing environment variables or regions. Nothing secret: the
// project reference is already visible in every browser request to Supabase.
export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return NextResponse.json(
    {
      database: /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(url)?.[1] ?? "not configured",
      functionRegion: process.env.VERCEL_REGION ?? "local",
      serviceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
