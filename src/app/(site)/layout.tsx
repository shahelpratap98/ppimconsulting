import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import { buildOrganizationSchema } from "@/lib/schema";

// Public website chrome. The staff portal (/portal) has its own layout and
// must never load the ad and analytics tags: its pages carry client data.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={buildOrganizationSchema()} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppButton />
      <Analytics />
    </>
  );
}
