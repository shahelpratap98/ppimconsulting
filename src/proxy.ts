import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hitMemory, ipFrom } from "@/lib/portal/rate-limit-memory";

// Runs for /portal only (see `config.matcher`): the static marketing pages are
// served straight from the CDN and never touch this code.

// Pages that work without a session.
const PUBLIC_PATHS = ["/portal/login", "/portal/reset", "/portal/auth"];

// Flood protection, per IP address, per server instance. Normal use is a few
// requests a minute; these only bite scripts and runaway clients. Tighter,
// database-backed limits on sign-in etc. live in lib/rate-limit.ts.
const WINDOW = 60; // seconds
const MAX_REQUESTS = 300; // any /portal request
const MAX_WRITES = 60; // POSTs (form submissions and saves)
const MAX_AUTH_WRITES = 20; // POSTs to the signed-out pages

function tooMany(retryAfter: number) {
  return new NextResponse("Too many requests. Wait a minute and try again.", {
    status: 429,
    headers: { "Retry-After": String(retryAfter), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // 1. rate limits, before any work is done
  const ip = ipFrom(request.headers);
  const all = hitMemory(`all:${ip}`, MAX_REQUESTS, WINDOW);
  if (!all.ok) return tooMany(all.retryAfter);
  if (request.method !== "GET" && request.method !== "HEAD") {
    const writes = hitMemory(`write:${ip}`, MAX_WRITES, WINDOW);
    if (!writes.ok) return tooMany(writes.retryAfter);
    if (isPublic) {
      const auth = hitMemory(`auth:${ip}`, MAX_AUTH_WRITES, WINDOW);
      if (!auth.ok) return tooMany(auth.retryAfter);
    }
  }

  // The portal needs its database keys; until they're set, say so plainly
  // instead of failing (the public website never depends on them).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return new NextResponse("The PPIM staff portal is being set up. Please check back soon.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "3600" },
    });
  }

  // 2. refresh the Supabase session cookie and bounce signed-out visitors to
  //    the sign-in page. Authorisation itself is enforced by row-level
  //    security in the database, not here.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() checks the token's signature against the project's public key
  // (fetched once and cached), so this costs no network round trip. It still
  // refreshes an expired session. getUser() would call Supabase on every request.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? { id: data.claims.sub } : null;

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/login";
    url.search = "";
    if (pathname !== "/portal") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/portal/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/my/day";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/portal", "/portal/:path*"],
};
