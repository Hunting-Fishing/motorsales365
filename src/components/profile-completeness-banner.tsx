import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type FieldKey =
  | "first_name"
  | "last_name"
  | "phone_e164"
  | "personal_email"
  | "signup_region"
  | "signup_province"
  | "signup_city"
  | "street_address"
  | "postal_code"
  | "business_name"
  | "business_kind"
  | "business_address"
  | "business_postal_code"
  | "business_region"
  | "business_province"
  | "business_city";

const LABELS: Record<FieldKey, string> = {
  first_name: "First name",
  last_name: "Last name",
  phone_e164: "Mobile number",
  personal_email: "Personal email",
  signup_region: "Region",
  signup_province: "Province",
  signup_city: "City",
  street_address: "Street address",
  postal_code: "Postal code",
  business_name: "Business name",
  business_kind: "Business category",
  business_address: "Business address",
  business_postal_code: "Business postal code",
  business_region: "Business region",
  business_province: "Business province",
  business_city: "Business city",
};

// Hash targets that exist on /dashboard/profile
const HASH_FOR: Partial<Record<FieldKey, string>> = {
  first_name: "field-first_name",
  last_name: "field-last_name",
  phone_e164: "field-phone",
  business_name: "field-business_name",
  business_address: "field-business_address",
  business_region: "field-business_location",
  business_province: "field-business_location",
  business_city: "field-business_location",
};

const isEmpty = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim().length === 0);

export function ProfileCompletenessBanner({ userId }: { userId: string | undefined }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem("profile-banner-dismissed") === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "seller_type,signup_intent,is_staff_account,first_name,last_name,phone,phone_e164,personal_email,signup_region,signup_province,signup_city,street_address,postal_code,business_name,business_kind,business_address,business_postal_code,business_region,business_province,business_city",
        )
        .eq("id", userId)
        .maybeSingle();
      if (!cancelled) {
        setProfile(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const missing = useMemo<FieldKey[]>(() => {
    if (!profile) return [];
    if (profile.is_staff_account) return [];
    const intent = (profile.signup_intent as string | null) ?? null;
    const seller = (profile.seller_type as string | null) ?? null;
    const isBusiness =
      intent === "business" ||
      intent === "service_provider" ||
      seller === "business" ||
      seller === "dealer";

    const required: FieldKey[] = [
      "first_name",
      "last_name",
      "personal_email",
      "signup_region",
      "signup_province",
      "signup_city",
    ];
    // phone: either phone_e164 or phone is fine
    const phoneMissing = isEmpty(profile.phone_e164) && isEmpty(profile.phone);

    if (isBusiness) {
      required.push(
        "business_name",
        "business_kind",
        "business_address",
        "business_postal_code",
        "business_region",
        "business_province",
        "business_city",
      );
    } else {
      required.push("street_address", "postal_code");
    }

    const out = required.filter((k) => isEmpty(profile[k]));
    if (phoneMissing) out.splice(2, 0, "phone_e164");
    return out;
  }, [profile]);

  if (loading || dismissed || !profile || missing.length === 0) return null;

  const first = missing[0];
  const hash = HASH_FOR[first];

  return (
    <div className="mb-4 rounded-xl border-2 border-dashed border-warning/40 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning text-warning-foreground">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Complete your profile — {missing.length} {missing.length === 1 ? "field" : "fields"} missing
            </p>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem("profile-banner-dismissed", "1");
                setDismissed(true);
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These fields are still empty — add them so buyers and sellers can reach you.
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {missing.map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span>{LABELS[k]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Button asChild size="sm">
              <Link to="/dashboard/profile" hash={hash}>
                Edit profile
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
