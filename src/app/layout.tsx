import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { JsonLd } from "@/components/JsonLd";
import { buildOrganizationSchema } from "@/lib/schema";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PPIM Consulting | Licensed Immigration Adviser, Auckland",
    template: "%s | PPIM Consulting",
  },
  description:
    "Priya Pratap Immigration Consulting (PPIM Consulting) — licensed immigration adviser in Auckland, New Zealand, with offices in Nadi and Suva, Fiji. Expert guidance on Skilled Migrant, Work, Student, Partner and Business visas.",
  keywords: [
    "immigration adviser Auckland",
    "New Zealand visa consultant",
    "skilled migrant visa",
    "work visa New Zealand",
    "IAA licensed adviser",
    "immigration consultant Fiji",
  ],
  metadataBase: new URL("https://www.ppimconsulting.co.nz"),
  alternates: { canonical: "./" },
  openGraph: {
    title: "PPIM Consulting | Licensed Immigration Adviser, Auckland",
    description:
      "Priya Pratap Immigration Consulting — licensed immigration advice in Auckland, New Zealand, with offices in Nadi and Suva, Fiji.",
    locale: "en_NZ",
    type: "website",
  },
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
      <body className="min-h-full flex flex-col">
        <JsonLd data={buildOrganizationSchema()} />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
