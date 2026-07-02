/**
 * Client hook for firing promoter/partner engagement events.
 * Debounced impressions (once per surface+variant per session) and
 * fire-and-forget CTA clicks.
 */
import { useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordPromoterEvent } from "@/lib/promoter-analytics.functions";

export type PromoterSurface =
  | "partner_program"
  | "promoter_resources"
  | "dashboard_partner_program"
  | "referral_landing";

type Payload = {
  cta_id?: string | null;
  variant?: string | null;
  partner_code?: string | null;
  meta?: Record<string, unknown> | null;
};

function getSessionHash(): string {
  if (typeof window === "undefined") return "";
  try {
    const k = "promoter-session-hash";
    let v = window.sessionStorage.getItem(k);
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    return "";
  }
}

function alreadyFiredThisSession(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.sessionStorage.getItem(key)) return true;
    window.sessionStorage.setItem(key, "1");
    return false;
  } catch {
    return false;
  }
}

export function usePromoterAnalytics(surface: PromoterSurface) {
  const record = useServerFn(recordPromoterEvent);
  const recordRef = useRef(record);
  recordRef.current = record;

  const fire = useCallback(
    (event: string, payload: Payload = {}) => {
      try {
        recordRef
          .current({
            data: {
              surface,
              event,
              cta_id: payload.cta_id ?? null,
              variant: payload.variant ?? null,
              partner_code: payload.partner_code ?? null,
              session_hash: getSessionHash(),
              path:
                typeof window !== "undefined" ? window.location.pathname.slice(0, 256) : null,
              referrer:
                typeof document !== "undefined" ? document.referrer.slice(0, 500) : null,
              meta: payload.meta ?? null,
            },
          })
          .catch(() => {});
      } catch {
        /* swallow */
      }
    },
    [surface],
  );

  const trackCta = useCallback(
    (ctaId: string, payload: Omit<Payload, "cta_id"> = {}) => {
      fire("cta_click", { ...payload, cta_id: ctaId });
    },
    [fire],
  );

  const trackDisclosureImpression = useCallback(
    (variant: string, payload: Omit<Payload, "variant"> = {}) => {
      const key = `promoter-impr-${surface}-${variant}`;
      if (alreadyFiredThisSession(key)) return;
      fire("disclosure_impression", { ...payload, variant });
    },
    [fire, surface],
  );

  return { fire, trackCta, trackDisclosureImpression };
}

/** Fire an impression once when an element enters the viewport (per session). */
export function useDisclosureImpressionOnVisible(
  surface: PromoterSurface | null | undefined,
  variant: string,
  partnerCode?: string | null,
) {
  const { trackDisclosureImpression } = usePromoterAnalytics(
    surface ?? "referral_landing",
  );
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!surface) return; // opt-in only
    const el = ref.current;
    if (!el || typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      trackDisclosureImpression(variant, { partner_code: partnerCode ?? null });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trackDisclosureImpression(variant, { partner_code: partnerCode ?? null });
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [surface, trackDisclosureImpression, variant, partnerCode]);

  return ref;
}

