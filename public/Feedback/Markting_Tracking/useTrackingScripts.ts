import { useEffect } from "react";
import { db, firestore } from "../config/firebase";
import { Tracking } from "../lib/tracking";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const isValidMetaPixelId = (id: string) => /^\d{10,16}$/.test(id.trim());
const isValidGA4Id = (id: string) => /^G-[A-Z0-9]{4,20}$/i.test(id.trim());

// ---------------------------------------------------------------------------
// Script injection (idempotent — never double-injects)
// ---------------------------------------------------------------------------
const injectMetaPixel = (pixelId: string) => {
  if (document.getElementById("meta-pixel-global")) return;

  const script = document.createElement("script");
  script.id = "meta-pixel-global";
  script.async = true;
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId.trim()}');
  `;
  document.head.appendChild(script);

  if (!document.getElementById("meta-pixel-noscript")) {
    const ns = document.createElement("noscript");
    ns.id = "meta-pixel-noscript";
    ns.innerHTML = `<img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=${pixelId.trim()}&ev=PageView&noscript=1"/>`;
    document.body?.appendChild(ns);
  }
};

const injectGA4 = (measurementId: string) => {
  if (document.getElementById("ga4-global-loader")) return;

  const loaderScript = document.createElement("script");
  loaderScript.id = "ga4-global-loader";
  loaderScript.async = true;
  loaderScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId.trim()}`;
  document.head.appendChild(loaderScript);

  const configScript = document.createElement("script");
  configScript.id = "ga4-global-config";
  configScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId.trim()}', { page_path: window.location.pathname });
  `;
  document.head.appendChild(configScript);
};

// ---------------------------------------------------------------------------
// Hook — called from Dashboard (already authenticated).
//
// Uses a one-time getDoc read (not a live listener) so there is zero risk
// of an ongoing permission-denied stream. If the document doesn't exist or
// permissions are insufficient the error is silently swallowed and tracking
// simply doesn't auto-inject — the user can still configure it manually
// via the Marketing Tracking tab.
// ---------------------------------------------------------------------------
export function useTrackingScripts() {
  useEffect(() => {
    if (!db || !firestore) return;

    let cancelled = false;

    const load = async () => {
      try {
        const docRef = firestore.doc(db, "settings", "marketingTracking");
        const snap = await firestore.getDoc(docRef);

        if (cancelled || !snap.exists()) return;

        const data = snap.data();
        if (!data) return;

        // Inject Meta Pixel
        const meta = data.meta;
        if (meta?.connected && meta?.pixel?.id && isValidMetaPixelId(meta.pixel.id)) {
          injectMetaPixel(meta.pixel.id);
        }

        // Inject Google Analytics 4
        const google = data.google;
        if (
          google?.connected &&
          google?.property?.measurementId &&
          isValidGA4Id(google.property.measurementId)
        ) {
          injectGA4(google.property.measurementId);
        }
      } catch {
        // Silently ignore — permission-denied or missing document
        // are both acceptable; tracking just won't auto-inject.
      }
    };

    load();

    // Fire initial page view (safe, only touches window.fbq / window.gtag)
    try {
      Tracking.page(window.location.pathname);
    } catch (_) {}

    return () => {
      cancelled = true;
    };
  }, []);
}
