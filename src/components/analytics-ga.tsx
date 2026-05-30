import { useEffect, useState } from "react";

const GA_MEASUREMENT_ID = "G-PRQZE27PNV";
const CONSENT_KEY = "ms_cookie_consent_v1";

/**
 * Google Analytics 4 loader, gated on cookie consent.
 *
 * - Renders nothing unless the user has accepted optional cookies.
 * - Listens for "ms-consent-changed" CustomEvent to enable after acceptance.
 * - Tracks SPA route changes via window history patching.
 */
export function AnalyticsGA() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      try {
        setEnabled(localStorage.getItem(CONSENT_KEY) === "accepted");
      } catch {
        setEnabled(false);
      }
    };
    check();
    window.addEventListener("ms-consent-changed", check);
    return () => window.removeEventListener("ms-consent-changed", check);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if ((window as any).__gaLoaded) return;
    (window as any).__gaLoaded = true;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true, send_page_view: true });

    // SPA route change tracking
    const trackPage = () => {
      gtag("event", "page_view", {
        page_path: window.location.pathname + window.location.search,
        page_location: window.location.href,
      });
    };
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function (...args) {
      origPush.apply(this, args as any);
      trackPage();
    };
    history.replaceState = function (...args) {
      origReplace.apply(this, args as any);
      trackPage();
    };
    window.addEventListener("popstate", trackPage);

    return () => {
      window.removeEventListener("popstate", trackPage);
    };
  }, [enabled]);

  return null;
}
