import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Simple LRU-ish cache; url + expiry
const cache = new Map<string, { url: string; exp: number }>();
const EXPIRES = 60 * 60 * 24 * 7; // 7 days
const REFRESH_MARGIN_MS = 60 * 60 * 1000;

export function useSignedMessageUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() => {
    if (!path) return null;
    const cached = cache.get(path);
    if (cached && cached.exp - Date.now() > REFRESH_MARGIN_MS) return cached.url;
    return null;
  });

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    const cached = cache.get(path);
    if (cached && cached.exp - Date.now() > REFRESH_MARGIN_MS) {
      setUrl(cached.url);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from("message-media")
      .createSignedUrl(path, EXPIRES)
      .then(({ data, error }) => {
        if (cancelled || error || !data?.signedUrl) return;
        cache.set(path, { url: data.signedUrl, exp: Date.now() + EXPIRES * 1000 });
        setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
