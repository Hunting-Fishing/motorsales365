// Shared pure validators for the "required signup identity" fields (phone +
// address). Used by the signup form, the /complete-profile route, and the
// server functions that persist and re-check the profile so OAuth signups
// can't slip through with missing/invalid data.

import { validatePhone } from "@/data/country-codes";

export type ProfileForCheck = {
  phone_e164: string | null;
  street_address: string | null;
  postal_code: string | null;
  business_address: string | null;
  business_postal_code: string | null;
  signup_intent?: string | null;
  seller_type?: string | null;
};

export type MissingField = {
  field: string;
  label: string;
  message: string;
};

export const POSTAL_RE = /^[A-Za-z0-9][A-Za-z0-9 \-]{2,10}$/;

export function isPostalValid(s: string | null | undefined): boolean {
  return !!s && POSTAL_RE.test(s.trim());
}

export function isAddressValid(s: string | null | undefined): boolean {
  if (!s) return false;
  const v = s.trim();
  // At least one digit (house/unit number), at least one 2+ letter word
  // (street name), overall length >= 5.
  return v.length >= 5 && /\d/.test(v) && /[A-Za-z]{2,}/.test(v);
}

export function isE164Valid(iso: string | null | undefined, national: string | null | undefined): boolean {
  if (!iso || !national) return false;
  return validatePhone(iso, national).valid;
}

export function isBusinessLike(profile: Pick<ProfileForCheck, "signup_intent" | "seller_type">): boolean {
  const intent = (profile.signup_intent ?? "").toLowerCase();
  const seller = (profile.seller_type ?? "").toLowerCase();
  return (
    intent === "business" ||
    intent === "service_provider" ||
    seller === "dealer" ||
    seller === "repair_shop" ||
    seller === "insurance"
  );
}

/**
 * Return the list of required identity fields that are missing or invalid on
 * the given profile row. Callers use `.length === 0` as the "complete" gate.
 */
export function getProfileMissingFields(profile: ProfileForCheck): MissingField[] {
  const missing: MissingField[] = [];

  // Phone: we only store the normalized E.164 on the profile row. Consider it
  // present when it exists AND passes E.164 shape (starts with +, 8-15 digits).
  const phone = (profile.phone_e164 ?? "").trim();
  if (!phone) {
    missing.push({
      field: "phone",
      label: "Mobile",
      message: "Enter your mobile number.",
    });
  } else if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    missing.push({
      field: "phone",
      label: "Mobile",
      message: "Enter a valid mobile number in international format.",
    });
  }

  const businessLike = isBusinessLike(profile);
  if (businessLike) {
    if (!profile.business_address?.trim()) {
      missing.push({
        field: "business-address",
        label: "Business street address",
        message: "Enter your business street address.",
      });
    } else if (!isAddressValid(profile.business_address)) {
      missing.push({
        field: "business-address",
        label: "Business street address",
        message: "Include both a building/unit number and street name.",
      });
    }
    const bpc = profile.business_postal_code ?? profile.postal_code;
    if (!bpc?.trim()) {
      missing.push({
        field: "business-postal-code",
        label: "Business postal code",
        message: "Enter your business postal / ZIP code.",
      });
    } else if (!isPostalValid(bpc)) {
      missing.push({
        field: "business-postal-code",
        label: "Business postal code",
        message: "Enter a valid postal / ZIP code.",
      });
    }
  } else {
    if (!profile.street_address?.trim()) {
      missing.push({
        field: "street-address",
        label: "Street address",
        message: "Enter your street address.",
      });
    } else if (!isAddressValid(profile.street_address)) {
      missing.push({
        field: "street-address",
        label: "Street address",
        message: "Include both a house/unit number and street name (e.g. 123 Rizal St).",
      });
    }
    if (!profile.postal_code?.trim()) {
      missing.push({
        field: "postal-code",
        label: "Postal code",
        message: "Enter your postal / ZIP code.",
      });
    } else if (!isPostalValid(profile.postal_code)) {
      missing.push({
        field: "postal-code",
        label: "Postal code",
        message: "Enter a valid postal / ZIP code.",
      });
    }
  }

  return missing;
}
