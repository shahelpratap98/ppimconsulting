import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/portal/auth-card";
import { WEBSITE_URL } from "@/lib/portal/paths";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  inactive: "This account has been deactivated. Talk to Priya if that's a mistake.",
  link: "That link has expired or was already used. Request a new one below.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  const notice = typeof params.error === "string" ? NOTICES[params.error] : undefined;

  return (
    <AuthCard
      title="Staff sign in"
      intro="Timesheets, cases and leave for the PPIM Consulting team."
      footer={
        <a href={WEBSITE_URL} className="underline-offset-4 hover:underline">
          Back to ppimconsulting.co.nz
        </a>
      }
    >
      <LoginForm next={next} notice={notice} />
      <p className="mt-5 text-sm text-muted">
        <Link href="/portal/reset" className="font-semibold text-accent-600 underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </AuthCard>
  );
}
