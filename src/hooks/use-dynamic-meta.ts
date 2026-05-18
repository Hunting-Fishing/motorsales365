import { useEffect } from "react";

type MetaInput = {
  title?: string;
  description?: string;
  canonical?: string;
};

/**
 * Client-side dynamic <title>/meta updater for routes whose SEO depends on
 * user-selected form state (e.g. category, business type). The route's static
 * head() still provides the SSR/crawler default; this hook refines it once
 * the user interacts. Restores the previous values on unmount.
 */
export function useDynamicMeta({ title, description, canonical }: MetaInput) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const prevTitle = document.title;
    const setMeta = (selector: string, attr: "name" | "property", key: string, value?: string) => {
      if (!value) return () => {};
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      const created = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute("content");
      el.setAttribute("content", value);
      return () => {
        if (created) el!.remove();
        else if (prev !== null) el!.setAttribute("content", prev);
      };
    };

    const setLink = (rel: string, href?: string) => {
      if (!href) return () => {};
      let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      const created = !el;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute("href");
      el.setAttribute("href", href);
      return () => {
        if (created) el!.remove();
        else if (prev !== null) el!.setAttribute("href", prev);
      };
    };

    if (title) document.title = title;
    const restorers = [
      setMeta(`meta[name="description"]`, "name", "description", description),
      setMeta(`meta[property="og:title"]`, "property", "og:title", title),
      setMeta(`meta[property="og:description"]`, "property", "og:description", description),
      setMeta(`meta[property="og:url"]`, "property", "og:url", canonical),
      setLink("canonical", canonical),
    ];

    return () => {
      document.title = prevTitle;
      restorers.forEach((r) => r());
    };
  }, [title, description, canonical]);
}
