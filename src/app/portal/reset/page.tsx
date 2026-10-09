import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/portal/auth-card";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPage() {
  return (
    <AuthCard
      title="Reset your password"
      intro="Enter your work email and we'll send you a link to choose a new password."
      footer={
        <Link href="/portal/login" className="underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetForm />
    </AuthCard>
  );
}
