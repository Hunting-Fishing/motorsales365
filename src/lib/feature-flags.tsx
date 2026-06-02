import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type FeatureFlagKey =
  | "towing"
  | "referrals"
  | "multiCurrency"
  | "adsInquiry"
  | "boosts"
  | "messaging"
  | "verifications";

export const FEATURE_FLAG_META: { key: FeatureFlagKey; label: string; description: string }[] = [
  {
    key: "towing",
    label: "Towing marketplace",
    description: "Tow request flows, provider bids, and towing nav entry.",
  },
  {
    key: "referrals",
    label: "Staff QR referrals",
    description: "QR-based referral codes, discounts, and redemptions.",
  },
  {
    key: "multiCurrency",
    label: "Multi-currency switcher",
    description: "Show the header currency switcher and apply conversions site-wide.",
  },
  {
    key: "adsInquiry",
    label: "Advertising inquiries",
    description: "Public Advertise form + inbound ad inquiry workflows.",
  },
  {
    key: "boosts",
    label: "Listing boosts",
    description: "Paid boosts and featured placement on listings.",
  },
  {
    key: "messaging",
    label: "Buyer ↔ seller messaging",
    description: "In-app inbox and contact buttons on listings.",
  },
  {
    key: "verifications",
    label: "Business verifications",
    description: "Verification submission + verified badges.",
  },
];

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const DEFAULT_FLAGS: FeatureFlags = FEATURE_FLAG_META.reduce((acc, f) => {
  acc[f.key] = true;
  return acc;
}, {} as FeatureFlags);

const STORAGE_KEY = "sandbox.flags";

function loadFlags(): FeatureFlags {
  if (typeof window === "undefined") return { ...DEFAULT_FLAGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FLAGS };
    const parsed = JSON.parse(raw) ?? {};
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  setFlag: (key: FeatureFlagKey, value: boolean) => void;
  setAll: (value: boolean) => void;
  reset: () => void;
}

const Ctx = createContext<FeatureFlagContextValue | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFlags());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch {}
  }, [flags]);

  const setFlag = (key: FeatureFlagKey, value: boolean) =>
    setFlags((prev) => ({ ...prev, [key]: value }));
  const setAll = (value: boolean) =>
    setFlags(() =>
      FEATURE_FLAG_META.reduce((a, f) => ({ ...a, [f.key]: value }), {} as FeatureFlags),
    );
  const reset = () => setFlags({ ...DEFAULT_FLAGS });

  return <Ctx.Provider value={{ flags, setFlag, setAll, reset }}>{children}</Ctx.Provider>;
}

export function useFeatureFlags() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFeatureFlags must be used within FeatureFlagProvider");
  return ctx;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { flags } = useFeatureFlags();
  return flags[key];
}
