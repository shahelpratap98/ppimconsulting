"use server";

import type { ActionState } from "@/components/portal/action-form";
import { requireProfile } from "@/lib/portal/auth";
import { rateLimit, waitMessage } from "@/lib/portal/rate-limit";
import { createClient } from "@/lib/portal/supabase/server";

const MIN_PASSWORD = 12;

export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile();
  const current = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) return { ok: false, message: `Use at least ${MIN_PASSWORD} characters. A short sentence works well.` };
  if (password !== confirm) return { ok: false, message: "The two new passwords don't match." };
  if (password === current) return { ok: false, message: "The new password is the same as the current one." };

  const limit = await rateLimit("passwordChange", profile.user_id);
  if (!limit.ok) return { ok: false, message: "Too many attempts. " + waitMessage(limit.retryAfter) };

  const supabase = await createClient();

  // Prove it's really them, not someone at an unlocked laptop.
  const { error: checkError } = await supabase.auth.signInWithPassword({ email: profile.email, password: current });
  if (checkError) return { ok: false, message: "The current password isn't right." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Password changed. Use the new one next time you sign in." };
}
