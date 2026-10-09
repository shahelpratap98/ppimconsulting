import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/portal/supabase/server";
import type { Profile, Role } from "@/lib/portal/types";

// The signed-in person's profile, or a redirect to /login. Cached per request.
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  // Local signature check (no network). The profile query below runs under
  // this token, so the database re-validates it and applies row-level security.
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/portal/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, display_name, email, role, standard_day_hours, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  // Deactivated staff keep their auth user (history stays intact) but the
  // database hides everything from them, including their own profile.
  if (!profile || !profile.is_active) redirect("/portal/login?error=inactive");

  return profile as Profile;
});

export const isAdviser = (role: Role) => role === "adviser" || role === "admin";
export const isAdmin = (role: Role) => role === "admin";

export async function requireAdviser(): Promise<Profile> {
  const profile = await requireProfile();
  if (!isAdviser(profile.role)) redirect("/portal/my/day");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!isAdmin(profile.role)) redirect("/portal/my/day");
  return profile;
}
