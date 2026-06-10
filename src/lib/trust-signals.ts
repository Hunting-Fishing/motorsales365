// Derive the 8 listing trust signals from a query row that joins the
// listing's seller profile and (optionally) the linked vehicle + its passport
// verification. Keep this pure so every page can map listings identically.

export interface TrustSignals {
  phoneVerified: boolean;
  idChecked: boolean;
  orCrSubmitted: boolean;
  documentsChecked: boolean;
  registeredOwner: boolean;
  deedChainAvailable: boolean;
  inspectionAvailable: boolean;
  passport: boolean;
}

export const EMPTY_TRUST_SIGNALS: TrustSignals = {
  phoneVerified: false,
  idChecked: false,
  orCrSubmitted: false,
  documentsChecked: false,
  registeredOwner: false,
  deedChainAvailable: false,
  inspectionAvailable: false,
  passport: false,
};

interface Row {
  attributes?: Record<string, any> | null;
  profiles?:
    | { verification_status?: string | null; phone_verified_at?: string | null }
    | null;
  vehicles?:
    | {
        is_public?: boolean | null;
        passport_slug?: string | null;
        vehicle_passport_verifications?: Array<{ status?: string | null }> | null;
      }
    | null;
  // Flat fallbacks for places that pre-flatten the row.
  seller_phone_verified?: boolean | null;
  seller_verified?: boolean | null;
  passport_published?: boolean | null;
  passport_documents_checked?: boolean | null;
}

export function deriveTrustSignals(r: Row | null | undefined): TrustSignals {
  if (!r) return { ...EMPTY_TRUST_SIGNALS };
  const attrs = r.attributes ?? {};
  const profile = r.profiles ?? null;
  const vehicle = r.vehicles ?? null;
  const passportApproved =
    !!vehicle?.vehicle_passport_verifications?.some((v) => v.status === "approved") ||
    !!r.passport_documents_checked;
  const passportPublic =
    (vehicle?.is_public === true && !!vehicle?.passport_slug) ||
    !!r.passport_published;
  return {
    phoneVerified:
      !!profile?.phone_verified_at || r.seller_phone_verified === true,
    idChecked:
      profile?.verification_status === "verified" || r.seller_verified === true,
    orCrSubmitted: ["complete", "partial", "in_process"].includes(
      String(attrs.or_cr_status ?? ""),
    ),
    documentsChecked: passportApproved,
    registeredOwner: String(attrs.registered_owner ?? "") === "yes",
    deedChainAvailable: attrs.deed_chain_available === true,
    inspectionAvailable: attrs.inspection_available === true,
    passport: passportPublic,
  };
}

export function trustSignalCount(s: TrustSignals): number {
  return Object.values(s).filter(Boolean).length;
}
