"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  GA_ID,
  GOOGLE_ADS_ID,
  META_PIXEL_ID,
  captureAttribution,
  trackContactClick,
  trackMetaPageView,
} from "@/lib/analytics";

// One gtag.js load serves both GA4 and Google Ads.
const GTAG_ID = GA_ID || GOOGLE_ADS_ID;

export function Analytics() {
  const pathname = usePathname();
  const firstPageView = useRef(true);

  useEffect(() => {
    captureAttribution();
    // The Pixel base code sends the first PageView itself; GA4 tracks
    // client-side navigations through enhanced measurement.
    if (firstPageView.current) {
      firstPageView.current = false;
      return;
    }
    trackMetaPageView();
  }, [pathname]);

  // WhatsApp and phone links live in many components, so listen once here.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) trackContactClick("phone");
      else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) trackContactClick("whatsapp");
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return (
    <>
      {GTAG_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`} />
          <Script id="gtag-init">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${
              GA_ID ? `gtag('config','${GA_ID}');` : ""
            }${GOOGLE_ADS_ID ? `gtag('config','${GOOGLE_ADS_ID}');` : ""}`}
          </Script>
        </>
      )}
      {META_PIXEL_ID && (
        <Script id="meta-pixel">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
