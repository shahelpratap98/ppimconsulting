import type { Metadata } from "next";
import { AuthCard } from "@/components/portal/auth-card";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Choose a password" };

// Reached from an invite or reset email, already signed in by /auth/confirm.
// proxy.ts sends anyone without a session back to /login.
export default function SetPasswordPage() {
  return (
    <AuthCard
      title="Choose a password"
      intro="At least 12 characters. You'll use it with your email to sign in from any device."
    >
      <SetPasswordForm />
    </AuthCard>
  );
}
