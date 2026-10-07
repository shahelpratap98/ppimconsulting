import type { NextConfig } from "next";

// React/Next need eval for dev-mode debugging only; never allowed in production.
const devScriptSrc =
  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

// Google tag (GA4 + Google Ads) and Meta Pixel endpoints. Google Ads uses the
// visitor's local Google domain, so include the markets the site targets.
const googleTag = [
  "https://www.googletagmanager.com",
  "https://*.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://www.googleadservices.com",
  "https://*.doubleclick.net",
  "https://pagead2.googlesyndication.com",
  "https://www.google.com",
  "https://www.google.co.nz",
  "https://www.google.com.au",
  "https://www.google.com.fj",
].join(" ");
const metaPixel = "https://connect.facebook.net https://www.facebook.com";

// Only allow the external services the site actually uses: FormSubmit
// (enquiry form relay), Google Maps (contact page embed), and the ad and
// analytics tags above.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devScriptSrc} ${googleTag} ${metaPixel}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${googleTag} ${metaPixel}`,
  "font-src 'self' data:",
  `connect-src 'self' https://formsubmit.co ${googleTag} ${metaPixel}`,
  "frame-src https://www.google.com https://www.googletagmanager.com https://*.doubleclick.net",
  "form-action 'self' https://formsubmit.co",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
