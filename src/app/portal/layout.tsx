import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Staff Portal", template: "%s · PPIM Staff Portal" },
  description: "PPIM Consulting staff portal.",
  robots: { index: false, follow: false },
};

// The site's root layout supplies <html>/<body> and fonts; this wrapper scopes
// the portal styles. No site header, footer or ad/analytics tags load here.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-root min-h-screen flex-1">{children}</div>;
}
