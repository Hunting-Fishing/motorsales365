import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SiteLayout } from "@/components/site-layout";
import { getCreditedCode } from "@/lib/referral";
import { AccountTypeGrid } from "@/components/signup/account-type-grid";
import { SIGNUP_TYPES, type SignupIntent } from "@/components/signup/account-type-grid.types";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { PhoneInput } from "@/components/phone-input";
import { buildE164 } from "@/data/country-codes";
import { siteOrigin } from "@/lib/site-config";
import { STAFF_EMAIL_DOMAIN, isStaffEmail } from "@/lib/staff-domain";


type SignupSearch = { type?: SignupIntent; redirect?: string };

function safeInternalPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => {
    const t = search.type;
    const valid = SIGNUP_TYPES.map((s) => s.id) as string[];
    return {
      type: typeof t === "string" && valid.includes(t) ? (t as SignupIntent) : undefined,
      redirect: safeInternalPath(search.redirect),
    };
  },
  component: SignupPage,
});

const POST_SIGNUP_ROUTE: Record<SignupIntent, string> = {
  buyer: "/dashboard",
  business: "/businesses/submit",
  service_provider: "/businesses/submit",
};

// All business / service categories are selectable regardless of the high-level
// intent (Business vs Service provider). Sourced from the canonical list so
// signup, admin, and discovery all share the same vocabulary.
import { BUSINESS_KIND_OPTIONS } from "@/data/business-kinds";

// Phone is now captured as { iso, national } via PhoneInput and normalized to
// E.164 via buildE164 on submit.

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/signup" });

  const [intent, setIntent] = useState<SignupIntent | null>(search.type ?? null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessKind, setBusinessKind] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [businessPostalCode, setBusinessPostalCode] = useState("");
  const [location, setLocation] = useState<LocationValue>({
    region: null,
    province: null,
    city: null,
    barangay: null,
  });
  const [refCode, setRefCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const isBusinessLike = intent === "business" || intent === "service_provider";
  const intentMeta = useMemo(() => SIGNUP_TYPES.find((s) => s.id === intent), [intent]);
  const kindOptions = useMemo(() => BUSINESS_KIND_OPTIONS, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneE164 = phoneNational.trim() ? buildE164(phoneIso, phoneNational) : "";
  const phoneValid = phoneE164 !== null;

  type Issue = { field: string; label: string; message: string };
  const issues = useMemo<Issue[]>(() => {
    const list: Issue[] = [];
    if (!intent)
      list.push({
        field: "intent",
        label: "Account type",
        message: "Choose what kind of account you'd like.",
      });
    if (!firstName.trim())
      list.push({ field: "firstName", label: "First name", message: "Enter your first name." });
    if (!lastName.trim())
      list.push({ field: "lastName", label: "Last name", message: "Enter your last name." });
    if (!email.trim())
      list.push({ field: "email", label: "Email", message: "Enter your email address." });
    else if (!emailValid)
      list.push({ field: "email", label: "Email", message: "Enter a valid email address." });
    if (phoneNational.trim() && !phoneValid)
      list.push({
        field: "phone",
        label: "Mobile",
        message: "Enter a valid mobile number or leave it blank.",
      });
    if (!location.city)
      list.push({ field: "city", label: "City / Town", message: "Choose your city or town." });
    if (isBusinessLike && !businessName.trim()) {
      list.push({
        field: "businessName",
        label: intent === "service_provider" ? "Service name" : "Business name",
        message: "Required for business and service accounts.",
      });
    }
    if (isBusinessLike && !businessKind) {
      list.push({
        field: "businessKind",
        label: "Category",
        message: "Pick the category that best describes your business.",
      });
    }
    if (!password)
      list.push({ field: "password", label: "Password", message: "Choose a password." });
    else if (password.length < 8)
      list.push({
        field: "password",
        label: "Password",
        message: "Password must be at least 8 characters.",
      });
    if (!confirmPassword)
      list.push({
        field: "confirm-password",
        label: "Confirm password",
        message: "Re-enter your password.",
      });
    else if (confirmPassword !== password)
      list.push({
        field: "confirm-password",
        label: "Confirm password",
        message: "Passwords do not match.",
      });
    if (!agreed)
      list.push({
        field: "terms",
        label: "Terms",
        message: "Agree to the Terms and Privacy Policy to continue.",
      });
    return list;
  }, [
    intent,
    firstName,
    lastName,
    email,
    emailValid,
    phoneNational,
    phoneValid,
    location.city,
    isBusinessLike,
    businessName,
    businessKind,
    password,
    confirmPassword,
    agreed,
  ]);

  const errorFor = (field: string) => {
    if (!submitAttempted && !touched[field]) return null;
    return issues.find((i) => i.field === field)?.message ?? null;
  };
  const invalidCls = (field: string) =>
    errorFor(field) ? "border-destructive focus-visible:ring-destructive" : "";

  useEffect(() => {
    const c = getCreditedCode();
    if (c) setRefCode(c);
  }, []);

  // Restore previously entered form data when the user comes back from verify-email
  // (e.g. wrong email). Stashed values take precedence over URL defaults.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("signup.pending");
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.intent) setIntent(p.intent);
      if (p.first_name !== undefined) setFirstName(p.first_name);
      if (p.last_name !== undefined) setLastName(p.last_name);
      if (p.email !== undefined) setEmail(p.email);
      if (p.phone_iso !== undefined) setPhoneIso(p.phone_iso);
      if (p.phone_national !== undefined) setPhoneNational(p.phone_national);
      if (p.business_name !== undefined) setBusinessName(p.business_name);
      if (p.business_address !== undefined) setBusinessAddress(p.business_address);
      if (p.business_kind !== undefined) setBusinessKind(p.business_kind);
      if (p.street_address !== undefined) setStreetAddress(p.street_address);
      if (p.postal_code !== undefined) setPostalCode(p.postal_code);
      if (p.business_postal_code !== undefined) setBusinessPostalCode(p.business_postal_code);
      if (p.region !== undefined || p.province !== undefined || p.city !== undefined) {
        setLocation({
          region: p.region ?? null,
          province: p.province ?? null,
          city: p.city ?? null,
          barangay: null,
        });
      }
      if (typeof p.agreed === "boolean") setAgreed(p.agreed);
      if (p.ref_code !== undefined) setRefCode(p.ref_code);
      window.localStorage.removeItem("signup.pending");
      // Focus and select email so the user can immediately change it
      setTimeout(() => {
        const el = document.getElementById("email") as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select();
        }
      }, 0);
    } catch {
      // ignore parse errors
    }
  }, []);

  const goAfterSignup = (fallback: string) => {
    const dest = search.redirect || fallback;
    if (dest.startsWith("/") && !dest.startsWith("//")) {
      window.location.assign(dest);
    } else {
      navigate({ to: fallback as any });
    }
  };

  useEffect(() => {
    if (!loading && user) goAfterSignup("/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  // Note: form fields are preserved when the user changes account type so
  // they don't have to start over. business_kind only renders for
  // business-like intents (gated by isBusinessLike) and all current options
  // are valid across business and service_provider, so no reset is needed.

  const stashPendingProfile = () => {
    try {
      const payload = {
        intent,
        full_name: fullName || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phoneE164 || undefined,
        phone_iso: phoneIso || undefined,
        phone_national: phoneNational.trim() || undefined,
        business_name: isBusinessLike ? businessName.trim() || undefined : undefined,
        business_address: isBusinessLike ? businessAddress.trim() || undefined : undefined,
        business_kind: isBusinessLike ? businessKind || undefined : undefined,
        street_address: streetAddress.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        business_postal_code: isBusinessLike ? businessPostalCode.trim() || undefined : undefined,
        region: location.region ?? undefined,
        province: location.province ?? undefined,
        city: location.city ?? undefined,
        is_business: isBusinessLike,
        agreed,
        ref_code: refCode.trim() || undefined,
      };
      window.localStorage.setItem("signup.pending", JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable; pending payload is best-effort only.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (issues.length > 0) {
      toast.error(
        `Please fix ${issues.length} ${issues.length === 1 ? "field" : "fields"} before continuing.`,
      );
      // scroll to first error
      const first = issues[0].field;
      const el = document.getElementById(`field-${first}`) ?? document.getElementById(first);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!intent) return;

    // The 365 staff domain is reserved — only admins can mint these accounts
    // via the internal Create User flow, so self-signup is blocked here.
    if (isStaffEmail(email)) {
      toast.error(
        `${STAFF_EMAIL_DOMAIN} is reserved for 365 employees. Ask a 365 admin to create your account.`,
      );
      return;
    }

    setSubmitting(true);
    stashPendingProfile();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phoneE164 || undefined,
          business_name: isBusinessLike ? businessName.trim() : undefined,
          business_address: isBusinessLike ? businessAddress.trim() || undefined : undefined,
          business_kind: isBusinessLike ? businessKind || undefined : undefined,
          street_address: streetAddress.trim() || undefined,
          postal_code: isBusinessLike
            ? businessPostalCode.trim() || undefined
            : postalCode.trim() || undefined,
          signup_city: location.city ?? undefined,
          signup_region: location.region ?? undefined,
          signup_province: location.province ?? undefined,
          referral_code: refCode || undefined,
          signup_intent: intent,
        },
        emailRedirectTo: `${siteOrigin()}/verify-email?intent=${intent}${search.redirect ? `&redirect=${encodeURIComponent(search.redirect)}` : ""}`,
      },
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message || "";
      if (/already|registered|exists|in use/i.test(msg)) {
        toast.error("That email is already registered. Try signing in instead.");
      } else {
        toast.error(msg);
      }
      return;
    }
    // Supabase returns a user with empty identities[] when the email is already
    // registered (to avoid leaking account existence). Treat as "already in use".
    const identities = (data.user as { identities?: unknown[] } | null)?.identities;
    if (data.user && Array.isArray(identities) && identities.length === 0) {
      toast.error("That email is already registered. Please sign in instead.");
      navigate({
        to: "/login",
        search: { redirect: search.redirect } as any,
      });
      return;
    }
    // If email confirmation is required, no session is returned — send to pending screen.
    if (!data.session) {
      toast.success("Account created — check your email to verify.");
      navigate({
        to: "/verify-email",
        search: { email, intent },
      });
      return;
    }
    // Edge case: confirmations disabled, session is live immediately.
    toast.success("Account created!");
    goAfterSignup(POST_SIGNUP_ROUTE[intent]);
  };

  const handleGoogle = async () => {
    if (!intent) {
      toast.error("Please choose what kind of account you'd like first.");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the Terms and Privacy Policy first.");
      return;
    }
    stashPendingProfile();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: siteOrigin(),
    });
    if (result.error) {
      toast.error("Could not sign up with Google");
      return;
    }
    if (result.redirected) return;
    goAfterSignup(POST_SIGNUP_ROUTE[intent]);
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Create your 365 MotorSales account
          </h1>
          <p className="mt-2 text-muted-foreground">
            Pick what brings you here — we'll tailor your dashboard around it.
          </p>
        </header>

        <section aria-labelledby="account-type-heading" className="mb-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2
              id="account-type-heading"
              className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              1. Account type
            </h2>
            {intent && (
              <span className="text-xs text-muted-foreground">Selected: {intentMeta?.label}</span>
            )}
          </div>
          <AccountTypeGrid value={intent} onChange={setIntent} />
          {intent && intentMeta?.note && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-semibold text-primary">Heads up</p>
              <p className="mt-1 text-muted-foreground">{intentMeta.note}</p>
            </div>
          )}
        </section>

        <form
          onSubmit={handleSubmit}
          className={cn(
            "space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm transition-opacity",
            !intent && "pointer-events-none opacity-50",
          )}
          aria-disabled={!intent}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              2. Your details
            </h2>
            <span className="text-xs text-muted-foreground">
              <span className="text-destructive">*</span> required
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div id="field-firstName">
              <Label htmlFor="first-name">
                First name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => markTouched("firstName")}
                autoComplete="given-name"
                aria-invalid={!!errorFor("firstName")}
                className={invalidCls("firstName")}
              />
              {errorFor("firstName") && (
                <p className="mt-1 text-xs text-destructive">{errorFor("firstName")}</p>
              )}
            </div>
            <div id="field-lastName">
              <Label htmlFor="last-name">
                Last name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="last-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => markTouched("lastName")}
                autoComplete="family-name"
                aria-invalid={!!errorFor("lastName")}
                className={invalidCls("lastName")}
              />
              {errorFor("lastName") && (
                <p className="mt-1 text-xs text-destructive">{errorFor("lastName")}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div id="field-phone">
              <Label htmlFor="phone">Mobile (optional)</Label>
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
                  {phoneNational.trim() && phoneValid && (
                    <span className="ml-1 text-emerald-600">✓ {phoneE164}</span>
                  )}
                </p>
              )}
            </div>
            <div id="field-email">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched("email")}
                autoComplete="email"
                aria-invalid={!!errorFor("email")}
                className={invalidCls("email")}
              />
              {errorFor("email") && (
                <p className="mt-1 text-xs text-destructive">{errorFor("email")}</p>
              )}
              {isStaffEmail(email) && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  {STAFF_EMAIL_DOMAIN} is reserved for 365 employees. Ask a 365 admin to create your account.
                </p>
              )}

            </div>
          </div>

          <div id="field-city">
            <Label className="mb-2 block">
              City / Town <span className="text-destructive">*</span>
            </Label>
            <LocationPicker
              value={location}
              onChange={(v) => {
                setLocation(v);
                markTouched("city");
              }}
              showBarangay={false}
            />
            {errorFor("city") && (
              <p className="mt-1 text-xs text-destructive">{errorFor("city")}</p>
            )}
          </div>

          {!isBusinessLike && (
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div>
                <Label htmlFor="street-address">Street address (optional)</Label>
                <Input
                  id="street-address"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. 123 Rizal Ave, Brgy. San Jose"
                  autoComplete="street-address"
                />
              </div>
              <div>
                <Label htmlFor="postal-code">Postal / ZIP code</Label>
                <Input
                  id="postal-code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 1000"
                  autoComplete="postal-code"
                  inputMode="text"
                />
              </div>
            </div>
          )}

          {isBusinessLike && (
            <div className="space-y-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Business details
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div id="field-businessName">
                  <Label htmlFor="business-name">
                    {intent === "service_provider" ? "Service name" : "Business / dealer name"}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="business-name"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    onBlur={() => markTouched("businessName")}
                    placeholder={
                      intent === "service_provider"
                        ? "e.g. Reyes Towing Services"
                        : "e.g. Manila Auto Hub"
                    }
                    aria-invalid={!!errorFor("businessName")}
                    className={invalidCls("businessName")}
                  />
                  {errorFor("businessName") && (
                    <p className="mt-1 text-xs text-destructive">{errorFor("businessName")}</p>
                  )}
                </div>
                <div id="field-businessKind">
                  <Label htmlFor="business-kind">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={businessKind}
                    onValueChange={(v) => {
                      setBusinessKind(v);
                      markTouched("businessKind");
                    }}
                  >
                    <SelectTrigger
                      id="business-kind"
                      aria-invalid={!!errorFor("businessKind")}
                      className={invalidCls("businessKind")}
                    >
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {kindOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errorFor("businessKind") && (
                    <p className="mt-1 text-xs text-destructive">{errorFor("businessKind")}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div>
                  <Label htmlFor="business-address">Street address (optional)</Label>
                  <Input
                    id="business-address"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="e.g. 123 Rizal Ave, Brgy. San Jose"
                    autoComplete="street-address"
                  />
                </div>
                <div>
                  <Label htmlFor="business-postal">Postal / ZIP code</Label>
                  <Input
                    id="business-postal"
                    value={businessPostalCode}
                    onChange={(e) => setBusinessPostalCode(e.target.value)}
                    placeholder="e.g. 1000"
                    autoComplete="postal-code"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can skip the street and postal for now, but your account won't go live or appear
                in the directory until a full business address is saved.
              </p>
            </div>
          )}

          <div id="field-password">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched("password")}
                autoComplete="new-password"
                aria-invalid={!!errorFor("password")}
                className={cn("pr-10", invalidCls("password"))}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errorFor("password") ? (
              <p className="mt-1 text-xs text-destructive">{errorFor("password")}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                At least 8 characters. Use a mix of letters and numbers.
              </p>
            )}
          </div>

          <div id="field-confirm-password">
            <Label htmlFor="confirm-password">
              Confirm password <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => markTouched("confirm-password")}
                autoComplete="new-password"
                aria-invalid={!!errorFor("confirm-password")}
                className={cn("pr-10", invalidCls("confirm-password"))}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errorFor("confirm-password") ? (
              <p className="mt-1 text-xs text-destructive">{errorFor("confirm-password")}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Re-enter your password to confirm.
              </p>
            )}
          </div>

          <div
            id="field-terms"
            className={cn(
              "flex items-start gap-3 rounded-lg border bg-muted/30 p-3",
              errorFor("terms") ? "border-destructive" : "border-border",
            )}
          >
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(v) => {
                setAgreed(v === true);
                markTouched("terms");
              }}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="terms"
                className="text-sm font-normal leading-relaxed text-muted-foreground"
              >
                I agree to the{" "}
                <Link to="/terms" className="font-medium text-primary underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="font-medium text-primary underline">
                  Privacy Policy
                </Link>
                .
              </Label>
              {errorFor("terms") && (
                <p className="mt-1 text-xs text-destructive">{errorFor("terms")}</p>
              )}
            </div>
          </div>

          {intent &&
            (issues.length > 0 ? (
              <div
                className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-center gap-2 font-semibold text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Before you can create your {intentMeta?.label.toLowerCase()} account
                </div>
                <ul className="mt-2 space-y-1 text-foreground">
                  {issues.map((i) => (
                    <li key={i.field} className="flex gap-2">
                      <span className="text-destructive">•</span>
                      <span>
                        <span className="font-medium">{i.label}:</span>{" "}
                        <span className="text-muted-foreground">{i.message}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                All set — you're ready to create your account.
              </div>
            ))}

          <Button type="submit" disabled={submitting || !intent} className="w-full" size="lg">
            {submitting
              ? "Creating account…"
              : intent
                ? `Create ${intentMeta?.label.toLowerCase()} account`
                : "Choose an account type to continue"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={!intent}
            className="w-full"
          >
            Continue with Google
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}
