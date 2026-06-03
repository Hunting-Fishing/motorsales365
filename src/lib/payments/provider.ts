/**
 * Payments provider abstraction (Phase 3.1).
 *
 * Typed seam for payment rails. Today, Stripe is the only enabled rail and
 * all checkout/webhook code calls it directly through the gateway helper in
 * `@/lib/stripe.server`. This module exists so future in-house rails
 * (PayMongo, Xendit, etc.) can be registered without touching call sites.
 *
 * Rail metadata only — NO third-party SDKs are imported here.
 */

export type PaymentProvider = "stripe" | "paymongo" | "xendit";

export interface PaymentRail {
  id: PaymentProvider;
  label: string;
  /** Hint for the UI; the live source of truth is `feature_flags.payments.<id>`. */
  defaultEnabled: boolean;
  region: "global" | "ph" | "id";
  supports: {
    oneTime: boolean;
    subscription: boolean;
    boost: boolean;
  };
}

/**
 * Static rail registry. Enablement is driven by feature_flags at runtime —
 * see `src/lib/feature-flags.functions.ts`. Adding a new rail = adding a row
 * here and an `INSERT` into `feature_flags`.
 */
export const PAYMENT_RAILS: ReadonlyArray<PaymentRail> = [
  {
    id: "stripe",
    label: "Card / Wallet (Stripe)",
    defaultEnabled: true,
    region: "global",
    supports: { oneTime: true, subscription: true, boost: true },
  },
  {
    id: "paymongo",
    label: "PayMongo (PH)",
    defaultEnabled: false,
    region: "ph",
    supports: { oneTime: true, subscription: true, boost: true },
  },
  {
    id: "xendit",
    label: "Xendit (PH / ID)",
    defaultEnabled: false,
    region: "id",
    supports: { oneTime: true, subscription: false, boost: false },
  },
];

export function getRail(id: PaymentProvider): PaymentRail | undefined {
  return PAYMENT_RAILS.find((r) => r.id === id);
}

export function flagKeyForRail(id: PaymentProvider): string {
  return `payments.${id}`;
}
