import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses row-level security. Used ONLY for Auth admin
// calls (creating invite and reset links). Every caller must check
// requireAdmin() first. Returns null when the key isn't configured so the
// staff page can explain what's missing instead of crashing.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
