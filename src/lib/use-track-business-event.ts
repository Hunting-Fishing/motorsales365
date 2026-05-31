/**
 * Tiny tracker hook for public mini-site events. Fire-and-forget, swallow errors.
 */
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordBusinessEvent } from "@/lib/business-analytics.functions";

type Kind =
  | "view" | "call_click" | "whatsapp_click" | "messenger_click" | "website_click"
  | "contact_click" | "share_click" | "book_click" | "book_created" | "book_confirmed"
  | "inquiry_submitted" | "gallery_view" | "video_play";

function getSessionHash(): string {
  if (typeof window === "undefined") return "";
  try {
    const k = "biz-session-hash";
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

export function useTrackBusinessEvent(businessId: string | null | undefined) {
  const record = useServerFn(recordBusinessEvent);
  const recordRef = useRef(record);
  recordRef.current = record;

  const track = (kind: Kind, meta?: Record<string, any>) => {
    if (!businessId) return;
    try {
      recordRef.current({
        data: {
          businessId,
          kind,
          meta: meta ?? null,
          sessionHash: getSessionHash(),
          referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : null,
        },
      }).catch(() => {});
    } catch {
      /* swallow */
    }
  };

  return track;
}

/** Fire a "view" event once on mount per session/business. */
export function useTrackPageView(businessId: string | null | undefined) {
  const track = useTrackBusinessEvent(businessId);
  const fired = useRef(false);
  useEffect(() => {
    if (!businessId || fired.current) return;
    if (typeof window === "undefined") return;
    const key = `biz-viewed-${businessId}`;
    try {
      if (window.sessionStorage.getItem(key)) {
        fired.current = true;
        return;
      }
      window.sessionStorage.setItem(key, "1");
    } catch { /* ignore */ }
    fired.current = true;
    track("view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);
}
