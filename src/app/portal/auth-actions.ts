"use server";

import { APP_URL } from "@/lib/portal/paths";
import { redirect } from "next/navigation";
import { clientIp, rateLimit, waitMessage } from "@/lib/portal/rate-limit";
import { createClient } from "@/lib/portal/supabase/server";

export type FormState = { error?: string; ok?: string } | undefined;

const MIN_PASSWORD = 12;

// Only same-site paths are allowed as a post-login destination.
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/portal/") ? next : "/portal/my/day";
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  // Stops password guessing: a few tries per account, a few more per network.
  const [byEmail, byIp] = await Promise.all([rateLimit("signInPerEmail", email), rateLimit("signInPerIp", await clientIp())]);
  if (!byEmail.ok || !byIp.ok) {
    return { error: "Too many sign-in attempts. " + waitMessage(Math.max(byEmail.retryAfter, byIp.retryAfter)) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Log the real reason for whoever is running the server; keep the on-screen
    // message vague unless the fix is in the person's own hands.
    console.error("[signIn]", error.code ?? error.status, error.message);
    if (error.code === "email_not_confirmed") {
      return { error: "This account's email hasn't been confirmed yet. Ask an admin to confirm it or send you a new sign-in link." };
    }
    if (error.status === 429) return { error: "Too many attempts. Wait a minute and try again." };
    return { error: "That email and password don't match. Try again, or reset your password." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function requestReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email you sign in with." };

  const [byEmail, byIp] = await Promise.all([rateLimit("resetPerEmail", email), rateLimit("resetPerIp", await clientIp())]);
  if (!byEmail.ok || !byIp.ok) return { error: "Too many reset requests. " + waitMessage(Math.max(byEmail.retryAfter, byIp.retryAfter)) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/portal/auth/confirm?next=/portal/set-password`,
  });
  if (error) console.error("[requestReset]", error.code ?? error.status, error.message);
  if (error?.status === 429) return { error: "A reset email was sent recently. Wait a minute before asking for another." };

  // Same answer whether or not the address exists.
  return { ok: "If that email has an account, a reset link is on its way. Check your inbox." };
}

export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD) {
    return { error: `Use at least ${MIN_PASSWORD} characters. A short sentence works well.` };
  }
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "That link has expired. Ask for a new one." };
  const limit = await rateLimit("passwordChange", user.id);
  if (!limit.ok) return { error: "Too many attempts. " + waitMessage(limit.retryAfter) };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/portal/my/day");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}
