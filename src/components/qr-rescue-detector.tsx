import { useEffect } from "react";

/**
 * Watches for scans of legacy QR codes that were printed with a stale
 * preview host (e.g. `<uuid>.lovableproject.com/r/<code>`). If any such
 * request lands on our origin — via referrer, an auth-bridge redirect
 * param, or an encoded URL parameter — we extract the referral code and
 * bounce the visitor to the canonical `/r/<code>` route.
 *
 * We can only rescue traffic that actually reaches our domain. Scans that
 * stop at the preview host's auth wall never touch us and cannot be
 * corrected client-side.
 */

const LEGACY_HOST_PATTERNS = [
  /lovableproject\.com/i,
  /id-preview--[0-9a-f-]+\.lovable\.app/i,
  /0738c881-614d-4885-8d75-1b7c90e0835e/i,
];

const REDIRECT_PARAM_KEYS = [
  "redirect_to",
  "redirect",
  "redirectTo",
  "next",
  "return_to",
  "returnTo",
  "continue",
  "url",
];

function extractCodeFromPath(value: string | null): string | null {
  if (!value) return null;
  try {
    // handle full URLs or bare paths
    const decoded = decodeURIComponent(value);
    const m = decoded.match(/\/r\/([a-zA-Z0-9_-]{1,64})/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function logRescue(payload: {
  code: string;
  reason: string;
  referrer: string;
  originalUrl: string;
}) {
  try {
    void fetch("/api/public/qr-rescue/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* best-effort */
  }
}

export function QrRescueDetector() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);

    // Already on the correct landing — nothing to fix.
    if (/^\/r\/[a-zA-Z0-9_-]{1,64}$/.test(url.pathname)) return;

    const referrer = document.referrer || "";
    const referrerIsLegacy = LEGACY_HOST_PATTERNS.some((rx) => rx.test(referrer));

    // 1) Look at common auth-bridge redirect params for an encoded /r/<code>.
    let code: string | null = null;
    let reason = "";
    for (const key of REDIRECT_PARAM_KEYS) {
      const v = url.searchParams.get(key);
      const c = extractCodeFromPath(v);
      if (c) {
        code = c;
        reason = `redirect_param:${key}`;
        break;
      }
    }

    // 2) Fallback: legacy referrer carrying /r/<code> in its own URL.
    if (!code && referrerIsLegacy) {
      const c = extractCodeFromPath(referrer);
      if (c) {
        code = c;
        reason = "legacy_referrer";
      }
    }

    // 3) Fallback: the current URL itself contains "/r/<code>" somewhere
    //    (some auth bridges append the intended path verbatim).
    if (!code) {
      const c = extractCodeFromPath(url.href.replace(url.origin, ""));
      if (c) {
        code = c;
        reason = "url_path_fragment";
      }
    }

    if (!code) return;

    logRescue({
      code,
      reason,
      referrer,
      originalUrl: window.location.href,
    });

    // Hard replace so back-button doesn't loop through the broken host.
    window.location.replace(`/r/${encodeURIComponent(code)}?src=qr&rescued=1`);
  }, []);

  return null;
}
