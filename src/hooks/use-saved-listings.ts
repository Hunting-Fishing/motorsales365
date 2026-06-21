import { useCallback, useEffect, useState } from "react";

const KEY = "marketplace:saved-listings";
const EVT = "marketplace:saved-listings:changed";

function read(): Set<string> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function write(set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    // ignore
  }
}

/**
 * Local-only "saved listings" — quick action heart on cards.
 * Persists in localStorage and syncs across components via a custom event.
 */
export function useSavedListings() {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const next = read();
    if (next.has(id)) next.delete(id);
    else next.add(id);
    write(next);
    setIds(new Set(next));
    return next.has(id);
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { ids, has, toggle };
}
