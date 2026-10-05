import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHero } from "@/components/PageHero";
import { AnimatedSection } from "@/components/AnimatedSection";
import { pageOpenGraph } from "@/lib/seo";
import { companyInfo } from "@/lib/data";

const DESCRIPTION =
  "How PPIM Consulting collects, uses, stores and protects your personal information under the New Zealand Privacy Act 2020.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  openGraph: pageOpenGraph("Privacy Policy | PPIM Consulting", DESCRIPTION, "/privacy"),
};

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AnimatedSection className="border-t border-navy-900/10 py-9 first:border-t-0 first:pt-0">
      <h2 className="font-display text-2xl text-navy-900">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-navy-700/85">{children}</div>
    </AnimatedSection>
  );
}

const linkCls = "text-gold-600 underline underline-offset-2";

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Privacy policy", path: "/privacy" },
        ]}
        eyebrow="Privacy"
        title="Privacy policy"
        intro="Immigration matters involve some of the most personal information you have. This policy explains what we collect, why, where it goes, and your rights under the New Zealand Privacy Act 2020."
      />

      <section className="py-20 md:py-28">
        <div className="container-page max-w-3xl">
          <p className="mb-10 text-sm text-navy-700/80">Last updated: October 2026</p>

          <Block title="Who we are">
            <p>
              This website is operated by {companyInfo.fullName} (
              {companyInfo.name}), {companyInfo.address}. Our privacy officer
              is Priya Pratap, who you can contact at{" "}
              <a href={`mailto:${companyInfo.email}`} className={linkCls}>
                {companyInfo.email}
              </a>
              .
            </p>
          </Block>

          <Block title="What we collect">
            <p>We collect only what we need to advise you:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>
                <strong className="text-navy-900">Enquiry details</strong> you
                enter in our consultation form: your name, email, phone number,
                the visa pathway you&apos;re interested in, and your message.
              </li>
              <li>
                <strong className="text-navy-900">Messages</strong> you send us
                by email, phone or WhatsApp.
              </li>
              <li>
                <strong className="text-navy-900">Case documents</strong> — such
                as passports, police and medical certificates and financial
                records — only once you engage us, and only as needed for your
                application.
              </li>
            </ul>
            <p>
              Please don&apos;t send passport numbers, identity documents or
              other sensitive records through the website form. We&apos;ll
              arrange a suitable way to share documents once you engage us.
            </p>
          </Block>

          <Block title="How we use it">
            <p>
              We use your information to respond to your enquiry, provide our
              immigration services, prepare and lodge applications on your
              behalf, and meet our professional and legal obligations. We
              never sell your information or use it for third-party marketing.
            </p>
          </Block>

          <Block title="Who we share it with">
            <p>We share your information only where needed:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>
                <strong className="text-navy-900">Immigration authorities</strong>{" "}
                — Immigration New Zealand or the Australian Department of Home
                Affairs — when we lodge an application for you.
              </li>
              <li>
                <strong className="text-navy-900">FormSubmit</strong>, the
                email-forwarding service that delivers our website form to our
                inbox.
              </li>
              <li>
                <strong className="text-navy-900">Microsoft 365</strong>, which
                hosts our email.
              </li>
              <li>
                <strong className="text-navy-900">WhatsApp (Meta)</strong>, if
                you choose to message us there.
              </li>
              <li>
                <strong className="text-navy-900">Vercel</strong>, which hosts
                this website.
              </li>
            </ul>
            <p>
              Some of these providers store or process information outside New
              Zealand. We use reputable providers with their own security and
              privacy commitments.
            </p>
          </Block>

          <Block title="Cookies and tracking">
            <p>
              This website does not use analytics, advertising or tracking
              cookies. The map on our contact page is provided by Google Maps,
              which may set its own cookies when it loads.
            </p>
          </Block>

          <Block title="How long we keep it">
            <p>
              We keep enquiry details only as long as needed to respond and
              follow up. Client files are kept for the period required by our
              professional obligations and then securely destroyed.
            </p>
          </Block>

          <Block title="Your rights">
            <p>
              You can ask to see the personal information we hold about you,
              and ask us to correct it. Contact our privacy officer at{" "}
              <a href={`mailto:${companyInfo.email}`} className={linkCls}>
                {companyInfo.email}
              </a>
              .
            </p>
            <p>
              If you&apos;re not satisfied with how we handle a privacy
              concern, you can complain to the{" "}
              <a href="https://www.privacy.org.nz/" target="_blank" rel="noopener noreferrer" className={linkCls}>
                Office of the Privacy Commissioner
              </a>{" "}
              in New Zealand, or the{" "}
              <a href="https://www.oaic.gov.au/" target="_blank" rel="noopener noreferrer" className={linkCls}>
                Office of the Australian Information Commissioner
              </a>{" "}
              for Australian matters.
            </p>
          </Block>
        </div>
      </section>
    </>
  );
}
