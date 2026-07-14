// Post-OAuth "complete your profile" gate. When the auth hook detects a
// freshly signed-in user whose profile is still missing the required phone /
// address fields (typically a Google OAuth signup that bypassed the full
// signup form, or one whose stashed data was invalid), we route them here
// and block navigation to their intended destination until this form passes
// server-side validation.
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { cn } from "@/lib/utils";
import {
  checkProfileCompletion,
  submitProfileCompletion,
} from "@/lib/profile-completion.functions";
import {
  isAddressValid,
  isPostalValid,
  isE164Valid,
  type MissingField,
} from "@/lib/profile-validation";
import { buildE164, validatePhone } from "@/data/country-codes";

type Search = { redirect?: string };

function safeInternalPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/_authenticated/complete-profile")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: safeInternalPath(s.redirect),
  }),
  component: CompleteProfilePage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto max-w-lg px-4 py-16">Not found.</div>
    </SiteLayout>
  ),
  head: () => ({
    meta: [
      { title: "Complete your profile · 365 MotorSales" },
      {
        name: "description",
        content: "Finish setting up your 365 MotorSales account.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function CompleteProfilePage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/complete-profile" });
  const checkFn = useServerFn(checkProfileCompletion);
  const submitFn = useServerFn(submitProfileCompletion);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profile-completion"],
    queryFn: () => checkFn({}),
  });

  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPostalCode, setBusinessPostalCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverMissing, setServerMissing] = useState<MissingField[] | null>(null);

  const businessLike = data?.businessLike ?? false;

  // If completeness passes, bounce to the intended destination immediately.
  useEffect(() => {
    if (data?.complete) {
      const dest = search.redirect ?? "/dashboard";
      navigate({ to: dest as any, replace: true });
    }
  }, [data?.complete, navigate, search.redirect]);

  const phoneCheck = validatePhone(phoneIso, phoneNational);
  const phoneE164Preview = phoneCheck.valid
    ? phoneCheck.e164 ?? ""
    : phoneNational.trim()
      ? buildE164(phoneIso, phoneNational) ?? ""
      : "";
  const phoneValid = isE164Valid(phoneIso, phoneNational);

  const needsPhone = useMemo(
    () => (data?.missing ?? []).some((m) => m.field === "phone"),
    [data?.missing],
  );
  const needsStreet = useMemo(
    () => (data?.missing ?? []).some((m) => m.field === "street-address"),
    [data?.missing],
  );
  const needsPostal = useMemo(
    () => (data?.missing ?? []).some((m) => m.field === "postal-code"),
    [data?.missing],
  );
  const needsBizAddress = useMemo(
    () => (data?.missing ?? []).some((m) => m.field === "business-address"),
    [data?.missing],
  );
  const needsBizPostal = useMemo(
    () => (data?.missing ?? []).some((m) => m.field === "business-postal-code"),
    [data?.missing],
  );

  // Client-side gating that mirrors the server rules — the submit button
  // stays disabled until every visible required field passes.
  const clientOk =
    (!needsPhone || phoneValid) &&
    (!needsStreet || isAddressValid(streetAddress)) &&
    (!needsPostal || isPostalValid(postalCode)) &&
    (!needsBizAddress || isAddressValid(businessAddress)) &&
    (!needsBizPostal || isPostalValid(businessPostalCode));

  const errorFor = (field: string): string | undefined => {
    const fromServer = serverMissing?.find((m) => m.field === field)?.message;
    if (fromServer) return fromServer;
    return undefined;
  };

  const invalidCls = (field: string) =>
    errorFor(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const scrollToField = (field: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(field);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).focus?.();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerMissing(null);
    if (!clientOk) {
      const first =
        (needsPhone && !phoneValid && "phone") ||
        (needsStreet && !isAddressValid(streetAddress) && "street-address") ||
        (needsPostal && !isPostalValid(postalCode) && "postal-code") ||
        (needsBizAddress && !isAddressValid(businessAddress) && "business-address") ||
        (needsBizPostal && !isPostalValid(businessPostalCode) && "business-postal-code") ||
        null;
      if (first) scrollToField(first);
      toast.error("Fix the highlighted fields to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitFn({
        data: {
          phone_iso: needsPhone ? phoneIso : undefined,
          phone_national: needsPhone ? phoneNational.trim() : undefined,
          street_address: needsStreet ? streetAddress.trim() : undefined,
          postal_code: needsPostal ? postalCode.trim() : undefined,
          business_address: needsBizAddress ? businessAddress.trim() : undefined,
          business_postal_code: needsBizPostal ? businessPostalCode.trim() : undefined,
        },
      });
      if (res.ok && res.complete) {
        toast.success("Profile completed.");
        const dest = search.redirect ?? "/dashboard";
        navigate({ to: dest as any, replace: true });
        return;
      }
      setServerMissing(res.missing);
      const firstServer = res.missing[0]?.field;
      if (firstServer) scrollToField(firstServer);
      toast.error(
        `${res.missing.length} field${res.missing.length === 1 ? "" : "s"} still need${res.missing.length === 1 ? "s" : ""} attention.`,
      );
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-lg px-4 py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Checking your profile…</p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 py-8 pb-40 md:py-12 md:pb-24">
        <header className="mb-6 md:mb-8">
          <h1 className="font-display text-2xl font-bold md:text-3xl">Finish your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Google signed you in, but we still need a few required details before you can
            continue. This is the same information every account provides at signup.
          </p>
        </header>

        {data.missing.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
            <p className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-4 w-4" />
              {data.missing.length} required field
              {data.missing.length === 1 ? "" : "s"} missing
            </p>
            <ul className="ml-6 list-disc space-y-1 text-muted-foreground">
              {data.missing.map((m) => (
                <li key={m.field}>
                  <span className="font-medium text-foreground">{m.label}:</span> {m.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {needsPhone && (
            <div>
              <Label htmlFor="phone">
                Mobile <span className="text-destructive">*</span>
              </Label>
              <PhoneInput
                id="phone"
                iso={phoneIso}
                national={phoneNational}
                onChange={({ iso, national }) => {
                  setPhoneIso(iso);
                  setPhoneNational(national);
                }}
              />
              {errorFor("phone") ? (
                <p className="mt-1 text-xs text-destructive">{errorFor("phone")}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick your country, then enter your number.
                  {phoneNational.trim() &&
                    (phoneValid ? (
                      <span className="ml-1 text-emerald-600">✓ {phoneE164Preview}</span>
                    ) : phoneE164Preview ? (
                      <span className="ml-1 text-muted-foreground">
                        Preview: <span className="font-mono">{phoneE164Preview}</span>
                        {phoneCheck.message ? ` — ${phoneCheck.message}` : ""}
                      </span>
                    ) : null)}
                </p>
              )}
            </div>
          )}

          {needsStreet && (
            <div>
              <Label htmlFor="street-address">
                Street address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="street-address"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                autoComplete="street-address"
                placeholder="e.g. 123 Rizal St., Barangay 2"
                className={invalidCls("street-address")}
              />
              <AddressChecklist
                items={[
                  { label: "House / unit number", ok: /\d/.test(streetAddress) },
                  { label: "Street name", ok: /[A-Za-z]{2,}/.test(streetAddress) },
                  { label: "At least 5 characters", ok: streetAddress.trim().length >= 5 },
                ]}
              />
            </div>
          )}

          {needsPostal && (
            <div>
              <Label htmlFor="postal-code">
                Postal / ZIP code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="postal-code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                autoComplete="postal-code"
                placeholder="e.g. 1000"
                className={invalidCls("postal-code")}
              />
              <p
                className={cn(
                  "mt-1 flex items-center gap-1.5 text-xs",
                  isPostalValid(postalCode) ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {isPostalValid(postalCode) ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                )}
                Valid postal / ZIP code
              </p>
            </div>
          )}

          {needsBizAddress && (
            <div>
              <Label htmlFor="business-address">
                Business street address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="business-address"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                autoComplete="street-address"
                placeholder="e.g. Unit 4, 88 Ortigas Ave."
                className={invalidCls("business-address")}
              />
              <AddressChecklist
                items={[
                  { label: "Building / unit number", ok: /\d/.test(businessAddress) },
                  { label: "Street name", ok: /[A-Za-z]{2,}/.test(businessAddress) },
                  { label: "At least 5 characters", ok: businessAddress.trim().length >= 5 },
                ]}
              />
            </div>
          )}

          {needsBizPostal && (
            <div>
              <Label htmlFor="business-postal-code">
                Business postal code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="business-postal-code"
                value={businessPostalCode}
                onChange={(e) => setBusinessPostalCode(e.target.value)}
                autoComplete="postal-code"
                className={invalidCls("business-postal-code")}
              />
              <p
                className={cn(
                  "mt-1 flex items-center gap-1.5 text-xs",
                  isPostalValid(businessPostalCode)
                    ? "text-emerald-600"
                    : "text-muted-foreground",
                )}
              >
                {isPostalValid(businessPostalCode) ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                )}
                Valid postal / ZIP code
              </p>
            </div>
          )}

          {businessLike && !needsBizAddress && !needsBizPostal && !needsPhone && (
            <p className="text-sm text-muted-foreground">
              Your profile already looks complete — redirecting…
            </p>
          )}

          {/* Sticky mobile action bar — sits above the bottom nav (bottom-20)
              on phones and clears the floating help widget. On md+ it renders
              inline at the bottom of the form. */}
          <div
            className={cn(
              "z-30 flex flex-col-reverse gap-3 border-t bg-background/95 backdrop-blur",
              "fixed inset-x-0 bottom-20 px-4 py-3 shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.15)]",
              "md:static md:bottom-auto md:flex-row md:items-center md:justify-between md:px-0 md:py-4 md:shadow-none md:backdrop-blur-none",
            )}
          >
            <p className="text-xs text-muted-foreground">
              You can't dismiss this step — the fields above are required for every account.
            </p>
            <Button
              type="submit"
              disabled={!clientOk || submitting}
              className="w-full md:w-auto"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save & continue"
              )}
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}

function AddressChecklist({
  items,
}: {
  items: { label: string; ok: boolean }[];
}) {
  return (
    <ul className="mt-2 space-y-1 text-xs" role="status" aria-live="polite">
      {items.map((it) => (
        <li
          key={it.label}
          className={cn(
            "flex items-center gap-1.5",
            it.ok ? "text-emerald-600" : "text-muted-foreground",
          )}
        >
          {it.ok ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          )}
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
