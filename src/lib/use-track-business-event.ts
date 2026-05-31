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

/**
 * Classify the traffic source for a view from URL params + referrer.
 * Buckets: ads, directory, name_search, relevant_search, listing, social, search_engine, external, direct.
 */
function classifySource(): { source: string; query: string | null; referrer: string | null } {
  if (typeof window === "undefined") return { source: "direct", query: null, referrer: null };
  const url = new URL(window.location.href);
  const sp = url.searchParams;
  const referrer = document.referrer ? document.referrer.slice(0, 500) : null;
  const explicit = (sp.get("src") || sp.get("utm_source") || "").toLowerCase();
  const q = sp.get("q") || sp.get("query");

  if (explicit) {
    if (["ad", "ads", "advert", "advertisement"].includes(explicit)) return { source: "ads", query: q, referrer };
    if (["directory", "browse"].includes(explicit)) {
      return { source: q ? "name_search" : "directory", query: q, referrer };
    }
    if (["search", "name_search"].includes(explicit)) return { source: "name_search", query: q, referrer };
    if (["category", "tag", "relevant", "related"].includes(explicit)) return { source: "relevant_search", query: q, referrer };
    if (["listing", "listings", "shop", "product"].includes(explicit)) return { source: "listing", query: q, referrer };
    return { source: explicit.slice(0, 32), query: q, referrer };
  }

  if (!referrer) return { source: "direct", query: q, referrer };
  try {
    const r = new URL(referrer);
    const sameHost = r.host === url.host;
    if (sameHost) {
      const p = r.pathname;
      if (p === "/businesses" || p === "/businesses/") return { source: "directory", query: q, referrer };
      if (p.startsWith("/businesses")) return { source: "relevant_search", query: q, referrer };
      if (p.startsWith("/shop") || p.startsWith("/listing")) return { source: "listing", query: q, referrer };
      if (p.startsWith("/advertise") || p.startsWith("/r/")) return { source: "ads", query: q, referrer };
      return { source: "internal", query: q, referrer };
    }
    const host = r.host.toLowerCase();
    if (/(google|bing|yahoo|duckduckgo|ecosia|yandex)\./.test(host)) return { source: "search_engine", query: q, referrer };
    if (/(facebook|fb\.|instagram|tiktok|twitter|x\.com|linkedin|youtube|t\.co|messenger)\./.test(host)) return { source: "social", query: q, referrer };
    return { source: "external", query: q, referrer };
  } catch {
    return { source: "external", query: q, referrer };
  }
}

/** Fire a "view" event once on mount per session/business, capturing the traffic source. */
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
    const info = classifySource();
    track("view", { source: info.source, query: info.query, referrer: info.referrer });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);
}
