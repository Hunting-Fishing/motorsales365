import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyDisplayCurrency, setMyDisplayCurrency } from "@/lib/currency.functions";

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  rate_to_php: number;
  decimals: number;
  active: boolean;
  sort_order: number;
  auto_update: boolean;
  last_updated_at: string;
};

const LS_KEY = "mref_currency";
const PHP_FALLBACK: Currency = {
  code: "PHP",
  name: "Philippine Peso",
  symbol: "₱",
  rate_to_php: 1,
  decimals: 2,
  active: true,
  sort_order: 0,
  auto_update: false,
  last_updated_at: new Date(0).toISOString(),
};

type Ctx = {
  /** Code of currently selected display currency. */
  code: string;
  setCode: (code: string) => void;
  /** Active currencies, sorted. PHP is always first. */
  currencies: Currency[];
  /** Currently selected currency (full record). */
  current: Currency;
  loading: boolean;
  /** Convert a PHP-denominated amount to the selected currency. */
  convert: (amountPhp: number, toCode?: string) => number;
  /** Format a PHP-denominated amount in the selected (or specified) currency. */
  format: (amountPhp: number, toCode?: string, opts?: { maxFraction?: number }) => string;
  refresh: () => Promise<void>;
};

const CurrencyCtx = createContext<Ctx | null>(null);

const sb = supabase as any;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([PHP_FALLBACK]);
  const [loading, setLoading] = useState(true);
  const [code, setCodeState] = useState<string>(() => {
    if (typeof window === "undefined") return "PHP";
    return window.localStorage.getItem(LS_KEY) || "PHP";
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("currencies")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (data && data.length) {
      setCurrencies(data as Currency[]);
    } else {
      setCurrencies([PHP_FALLBACK]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Sync display currency with the signed-in user's profile so the
  // preference follows them across devices. Local storage stays as a
  // fast-path fallback for anonymous visitors / SSR.
  const syncedUserRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const pullForUser = async (userId: string | null) => {
      if (!userId) {
        syncedUserRef.current = null;
        return;
      }
      if (syncedUserRef.current === userId) return;
      syncedUserRef.current = userId;
      try {
        const { code: remote } = await getMyDisplayCurrency();
        if (cancelled) return;
        if (remote && remote !== code) {
          setCodeState(remote);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(LS_KEY, remote);
          }
        } else if (!remote && code && code !== "PHP") {
          // First-time sync: persist the locally-chosen code to the profile.
          await setMyDisplayCurrency({ data: { code } });
        }
      } catch {
        // Best-effort: ignore network/auth failures, keep local value.
      }
    };
    supabase.auth.getUser().then(({ data }) => pullForUser(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      pullForUser(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // We intentionally only run once on mount; `code` is read via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCode = useCallback((next: string) => {
    setCodeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, next);
    }
    // Persist to profile when signed in. Fire-and-forget.
    void setMyDisplayCurrency({ data: { code: next } }).catch(() => {});
  }, []);

  const map = useMemo(() => {
    const m = new Map<string, Currency>();
    currencies.forEach((c) => m.set(c.code, c));
    if (!m.has("PHP")) m.set("PHP", PHP_FALLBACK);
    return m;
  }, [currencies]);

  const current = map.get(code) || map.get("PHP") || PHP_FALLBACK;

  const convert = useCallback(
    (amountPhp: number, toCode?: string) => {
      const c = map.get(toCode || code) || PHP_FALLBACK;
      if (!c.rate_to_php || c.rate_to_php <= 0) return amountPhp;
      return amountPhp / c.rate_to_php;
    },
    [map, code],
  );

  const format = useCallback(
    (amountPhp: number, toCode?: string, opts?: { maxFraction?: number }) => {
      const c = map.get(toCode || code) || PHP_FALLBACK;
      const value = convert(amountPhp, c.code);
      const maxFraction = opts?.maxFraction ?? c.decimals ?? 2;
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFraction,
      }).format(value);
      return `${c.symbol}${formatted}`;
    },
    [map, code, convert],
  );

  const value: Ctx = useMemo(
    () => ({ code, setCode, currencies, current, loading, convert, format, refresh: load }),
    [code, setCode, currencies, current, loading, convert, format, load],
  );

  return <CurrencyCtx.Provider value={value}>{children}</CurrencyCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- Provider + hook colocation (React idiom)
export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) {
    // Fallback when used outside provider (e.g. SSR shells)
    return {
      code: "PHP",
      setCode: () => {},
      currencies: [PHP_FALLBACK],
      current: PHP_FALLBACK,
      loading: false,
      convert: (n) => n,
      format: (n) => `₱${Math.round(n).toLocaleString()}`,
      refresh: async () => {},
    };
  }
  return ctx;
}
