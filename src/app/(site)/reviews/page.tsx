import type { Metadata } from "next";
import { Star, GoogleLogo, FacebookLogo } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Reveal } from "@/components/Reveal";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildReviewsSchema } from "@/lib/schema";
import { pageOpenGraph } from "@/lib/seo";
import { facebookReviews } from "@/lib/data";
import { googleReviews, reviews } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Client Reviews",
  description:
    "Read what clients say about Priya Pratap Immigration Consultant — rated 4.9 out of 5 across 153 Google reviews for New Zealand and Australian visa advice.",
  openGraph: pageOpenGraph(
    "Client Reviews | PPIM Consulting",
    "Rated 4.9 out of 5 across 153 Google reviews. Read what clients say about their visa journey with Priya Pratap Immigration Consultant.",
    "/reviews"
  ),
};

function Stars({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={18} weight="fill" className="text-gold-500" />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  return (
    <>
      <JsonLd data={buildReviewsSchema()} />

      <section className="bg-navy-950 py-24 text-cream md:py-32">
        <div className="container-page">
          <Reveal className="max-w-2xl" fade={false}>
            <Breadcrumbs
              crumbs={[
                { name: "Home", path: "/" },
                { name: "Reviews", path: "/reviews" },
              ]}
            />
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-gold-400">
              Client Reviews
            </span>
            <h1 className="mt-3 text-balance font-display text-4xl md:text-5xl">
              Trusted by migrants and their families.
            </h1>
            <p className="mt-6 text-balance text-lg leading-relaxed text-cream/70">
              Every review here is a real client&apos;s own words, left publicly
              on Google. They span visitor, work, student, partnership and
              residence applications across New Zealand, Australia and Fiji.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-6">
              <div className="flex items-center gap-4">
                <span className="font-display text-5xl leading-none text-cream">
                  {googleReviews.rating.toFixed(1)}
                </span>
                <div>
                  <Stars />
                  <p className="mt-1 text-sm text-cream/60">
                    {googleReviews.reviewCount} Google reviews
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button href={googleReviews.url} external>
                  <GoogleLogo size={18} weight="fill" />
                  See them on Google
                </Button>
                <Button href={facebookReviews.url} external variant="ghostLight">
                  <FacebookLogo size={18} weight="fill" />
                  {facebookReviews.recommendPercent}% recommend on Facebook
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-page">
          <AnimatedSection>
            <div className="[column-fill:_balance] gap-6 sm:columns-2 lg:columns-3">
              {reviews.map((review, i) => (
                <figure
                  key={i}
                  className="mb-6 break-inside-avoid rounded-card border border-navy-900/10 bg-white/80 p-6 shadow-[0_12px_40px_-24px_rgba(13,29,46,0.25)]"
                >
                  <div className="flex items-center justify-between">
                    <Stars />
                    <GoogleLogo size={18} weight="fill" className="text-navy-900/25" />
                  </div>
                  <blockquote className="mt-4 text-[15px] leading-relaxed text-navy-800/90">
                    {review.quote}
                  </blockquote>
                  <figcaption className="mt-4 border-t border-navy-900/5 pt-3 text-sm font-semibold text-navy-900">
                    {review.name}
                    <span className="ml-2 font-normal text-navy-700/50">
                      Google review
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="mt-16 flex flex-col items-center gap-5 text-center">
              <p className="max-w-xl text-balance text-navy-700/70">
                These are a selection of our {googleReviews.reviewCount}+ Google
                reviews. We&apos;d be glad to add your family&apos;s story to them.
              </p>
              <Button href="/book-consultation" size="lg">
                Book a Consultation
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
