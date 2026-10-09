import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { AnimatedSection } from "@/components/AnimatedSection";
import { pageOpenGraph } from "@/lib/seo";
import { companyInfo } from "@/lib/data";

const DESCRIPTION =
  "How PPIM Consulting works with clients: free first consultation, written client agreements, how fees work, and how to raise a complaint.";

export const metadata: Metadata = {
  title: "Fees, Client Agreements & Complaints",
  description: DESCRIPTION,
  openGraph: pageOpenGraph(
    "Fees, Client Agreements & Complaints | PPIM Consulting",
    DESCRIPTION,
    "/client-care"
  ),
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AnimatedSection className="border-t border-navy-900/10 py-10 first:border-t-0 first:pt-0">
      <h2 className="font-display text-2xl text-navy-900 md:text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-navy-700/85">{children}</div>
    </AnimatedSection>
  );
}

const linkCls = "text-gold-600 underline underline-offset-2";

export default function ClientCarePage() {
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Fees, agreements & complaints", path: "/client-care" },
        ]}
        eyebrow="Client care"
        title="Fees, client agreements and complaints"
        intro="As a licensed immigration adviser and registered migration agent, Priya Pratap is bound by professional codes of conduct in New Zealand and Australia. Here's what that means for you."
      />

      <section className="py-20 md:py-28">
        <div className="container-page max-w-3xl">
          <Block title="Your first consultation is free">
            <p>
              Your initial consultation costs nothing and carries no
              obligation. We use it to understand your situation, explain
              which pathways are realistic, and tell you honestly if
              applying now isn&apos;t in your interest.
            </p>
          </Block>

          <Block title="A written agreement before any paid work">
            <p>
              If you decide to go ahead, you&apos;ll receive a written client
              agreement before we start any paid work. It sets out:
            </p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>the services we will provide and what is not included;</li>
              <li>our professional fee and when each payment is due;</li>
              <li>the government and third-party costs you will pay separately;</li>
              <li>our refund terms if the engagement ends early; and</li>
              <li>how we keep your information confidential.</li>
            </ul>
            <p>
              Nothing is charged until you have read and signed the agreement.
            </p>
          </Block>

          <Block title="How fees work">
            <p>
              Our professional fee depends on the visa and the complexity of
              your case, so we quote it in writing after your free
              consultation rather than publishing a one-size price.
            </p>
            <p>
              Government charges — Immigration New Zealand or Department of
              Home Affairs fees and levies — are paid separately, as are
              costs such as medical examinations, police certificates and
              translations. We list every expected cost upfront so there are
              no surprises.
            </p>
          </Block>

          <Block title="How to raise a complaint">
            <p>
              If you&apos;re unhappy with our service, please tell us — most
              concerns can be resolved quickly by talking them through.
            </p>
            <ol className="list-decimal space-y-3 pl-6">
              <li>
                <strong className="text-navy-900">Contact Priya directly.</strong>{" "}
                Email{" "}
                <a href={`mailto:${companyInfo.email}`} className={linkCls}>
                  {companyInfo.email}
                </a>{" "}
                or call{" "}
                <a href={`tel:${companyInfo.phone.replace(/\s/g, "")}`} className={linkCls}>
                  {companyInfo.phone}
                </a>
                , setting out your concern and what you would like to happen.
              </li>
              <li>
                <strong className="text-navy-900">We acknowledge and investigate.</strong>{" "}
                We&apos;ll confirm we have received your complaint, look into
                it fully, and give you a written response explaining what we
                found and what we will do.
              </li>
              <li>
                <strong className="text-navy-900">
                  If you&apos;re still not satisfied, you can go to the regulator.
                </strong>{" "}
                For New Zealand immigration advice, complain to the{" "}
                <a href="https://www.iaa.govt.nz/" target="_blank" rel="noopener noreferrer" className={linkCls}>
                  Immigration Advisers Authority
                </a>
                . For Australian visa assistance, complain to the{" "}
                <a href="https://www.mara.gov.au/" target="_blank" rel="noopener noreferrer" className={linkCls}>
                  Office of the Migration Agents Registration Authority
                </a>
                .
              </li>
            </ol>
            <p>
              You can contact the regulator at any time — you don&apos;t have
              to complain to us first. A copy of our full complaints procedure
              is available on request.
            </p>
          </Block>

          <Block title="Checking our registration">
            <p>
              Priya Pratap holds IAA licence 201100160 for New Zealand
              immigration advice and is a Registered Migration Agent in
              Australia (MARN 2217960). You can confirm both independently on
              the{" "}
              <a href={companyInfo.iaaRegisterUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
                IAA
              </a>{" "}
              and{" "}
              <a href={companyInfo.maraRegisterUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
                MARA
              </a>{" "}
              registers.
            </p>
          </Block>

          <div className="pt-6">
            <Button href="/book-consultation" size="lg">
              Book a Free Consultation
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
