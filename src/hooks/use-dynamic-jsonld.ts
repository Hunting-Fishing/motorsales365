import { useEffect } from "react";

/**
 * Inject a JSON-LD <script> into <head> keyed by id. Replaces or removes the
 * script as the payload changes; cleans up on unmount. SSR-safe (no-op).
 */
export function useDynamicJsonLd(id: string, data: Record<string, unknown> | null | undefined) {
  const serialized = JSON.stringify(data ?? null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const selector = `script[type="application/ld+json"][data-dyn="${id}"]`;
    const existing = document.head.querySelector<HTMLScriptElement>(selector);
    if (!serialized || serialized === "null") {
      existing?.remove();
      return;
    }
    const el = existing ?? document.createElement("script");
    el.setAttribute("type", "application/ld+json");
    el.setAttribute("data-dyn", id);
    el.textContent = serialized;
    if (!existing) document.head.appendChild(el);
    return () => {
      document.head.querySelector(selector)?.remove();
    };
  }, [id, serialized]);
}
