import { PageLoading } from "@/components/portal/spinner";

// Next.js shows this inside the portal frame (the top bar stays put) whenever
// a page is still being built on the server: menu clicks, week changes, etc.
export default function Loading() {
  return <PageLoading />;
}
