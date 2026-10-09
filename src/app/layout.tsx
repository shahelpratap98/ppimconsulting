import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { pageOpenGraph } from "@/lib/seo";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // Body text keeps its size-adjusted fallback on slow first loads instead of
  // re-painting when Inter arrives — that late swap was the mobile LCP.
  display: "optional",
});

export const metadata: Metadata = {
  title: {
    default: "PPIM Consulting | Licensed Immigration Adviser, Auckland",
    template: "%s | PPIM Consulting",
  },
  description:
    "Licensed immigration adviser in Auckland (IAA 201100160) and registered Australian migration agent, with offices in Nadi and Suva, Fiji.",
  keywords: [
    "immigration adviser Auckland",
    "New Zealand visa consultant",
    "skilled migrant visa",
    "work visa New Zealand",
    "IAA licensed adviser",
    "immigration consultant Fiji",
    "registered migration agent",
  ],
  metadataBase: new URL("https://www.ppimconsulting.co.nz"),
  alternates: { canonical: "./" },
  openGraph: pageOpenGraph(
    "PPIM Consulting | Licensed Immigration Adviser, Auckland",
    "Priya Pratap Immigration Consulting — licensed advice for New Zealand and Australian visas, from Auckland, Nadi and Suva.",
    "/"
  ),
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
