import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";


import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getCreditedCode } from "@/lib/referral";
import { SIGNUP_TYPES, type SignupIntent } from "@/components/signup/account-type-grid.types";
import { LocationPicker, type LocationValue } from "@/components/location-picker";
import { PhoneInput } from "@/components/phone-input";
import { buildE164, getPhoneHint, validatePhone } from "@/data/country-codes";
import { siteOrigin } from "@/lib/site-config";
import { STAFF_EMAIL_DOMAIN, isStaffEmail } from "@/lib/staff-domain";
import { readPending, writePending, clearPending } from "@/lib/signup-pending";


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

type ChecklistItem = { label: string; ok: boolean };

// Real-time, per-field completeness indicator rendered under an address or
// postal input. Turns green as each requirement is satisfied so users see
// progress while typing — no wait for blur / submit.
function AddressChecklist({ items, active }: { items: ChecklistItem[]; active: boolean }) {
  if (!active) return null;
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
  const phoneCheck = validatePhone(phoneIso, phoneNational);
  const phoneE164 = phoneCheck.valid ? phoneCheck.e164 ?? "" : phoneNational.trim() ? buildE164(phoneIso, phoneNational) ?? "" : "";
  const phoneValid = phoneCheck.valid;
  const phoneMessage = phoneCheck.message;
  const postalOk = (s: string) => /^[A-Za-z0-9][A-Za-z0-9 \-]{2,10}$/.test(s.trim());
  // Real-time granular checks used by the AddressChecklist UI.
  const addrHasNumber = (s: string) => /\d/.test(s);
  const addrHasStreetName = (s: string) => {
    // At least one word made of letters (2+ chars). Numbers alone don't count.
    return /[A-Za-z]{2,}/.test(s);
  };
  const addrLongEnough = (s: string) => s.trim().length >= 5;
  const addressOk = (s: string) =>
    addrLongEnough(s) && addrHasStreetName(s) && addrHasNumber(s);

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
    if (!phoneNational.trim())
      list.push({
        field: "phone",
        label: "Mobile",
        message: "Enter your mobile number.",
      });
    else if (!phoneValid)
      list.push({
        field: "phone",
        label: "Mobile",
        message: phoneMessage ?? "Enter a valid mobile number for the selected country.",
      });
    if (!location.region)
      list.push({ field: "city", label: "Region", message: "Choose your region." });
    if (!location.province)
      list.push({ field: "city", label: "Province", message: "Choose your province." });
    if (!location.city)
      list.push({ field: "city", label: "City / Town", message: "Choose your city or town." });
    if (!location.region)
      list.push({ field: "city", label: "Region", message: "Choose your region." });
    if (!location.province)
      list.push({ field: "city", label: "Province", message: "Choose your province." });
    if (!location.city)
      list.push({ field: "city", label: "City / Town", message: "Choose your city or town." });
    if (!isBusinessLike) {
      if (!streetAddress.trim())
        list.push({
          field: "street-address",
          label: "Street address",
          message: "Enter your street address.",
        });
      else if (!addressOk(streetAddress))
        list.push({
          field: "street-address",
          label: "Street address",
          message: "Include both a house/unit number and street name (e.g. 123 Rizal St).",
        });
      if (!postalCode.trim())
        list.push({
          field: "postal-code",
          label: "Postal code",
          message: "Enter your postal / ZIP code.",
        });
      else if (!postalOk(postalCode))
        list.push({
          field: "postal-code",
          label: "Postal code",
          message: "Enter a valid postal / ZIP code (3–11 letters, digits, or dashes).",
        });
    }
    if (isBusinessLike) {
      if (!businessAddress.trim())
        list.push({
          field: "business-address",
          label: "Business street address",
          message: "Enter your business street address.",
        });
      else if (!addressOk(businessAddress))
        list.push({
          field: "business-address",
          label: "Business street address",
          message: "Include both a building/unit number and street name.",
        });
      if (!businessPostalCode.trim())
        list.push({
          field: "business-postal",
          label: "Business postal code",
          message: "Enter your business postal / ZIP code.",
        });
      else if (!postalOk(businessPostalCode))
        list.push({
          field: "business-postal",
          label: "Business postal code",
          message: "Enter a valid postal / ZIP code (3–11 letters, digits, or dashes).",
        });
    }

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
    phoneMessage,
    location.city,
    location.region,
    location.province,
    streetAddress,
    postalCode,
    businessAddress,
    businessPostalCode,
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
    const p = readPending();
    if (!p) return;
    try {
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
      // Keep the stash: the post-auth applier will clear it once the
      // profile row is patched. If the user returns to this form (e.g.
      // "Wrong email? Start over"), we still want their inputs available.
      // Focus and select email so the user can immediately change it.
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
    writePending({
      intent: intent ?? undefined,
      full_name: fullName || undefined,
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      email: email.trim() || undefined,
      personal_email: email.trim() || undefined,
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
      saved_at: Date.now(),
    });
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

    const res = await fetch("/api/public/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intent,
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_iso: phoneIso,
        phone_national: phoneNational.trim(),
        signup_region: location.region,
        signup_province: location.province,
        signup_city: location.city,
        street_address: streetAddress.trim(),
        postal_code: postalCode.trim(),
        business_name: businessName.trim(),
        business_kind: businessKind || undefined,
        business_address: businessAddress.trim(),
        business_postal_code: businessPostalCode.trim(),
        referral_code: refCode || "",
        redirect: search.redirect ?? "",
        origin: siteOrigin(),
        agreed: true,
      }),
    });
    setSubmitting(false);
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    if (!res.ok || !body?.ok) {
      const errs: { field: string; message: string }[] = body?.errors ?? [];
      const first = errs[0];
      if (res.status === 409) {
        toast.error("That email is already registered. Try signing in instead.");
        navigate({ to: "/login", search: { redirect: search.redirect } as any });
        return;
      }
      toast.error(first?.message ?? `Signup failed (${res.status}).`);
      if (first?.field) {
        const el =
          document.getElementById(`field-${first.field}`) ?? document.getElementById(first.field);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    if (body.needs_verify) {
      toast.success("Account created — check your email to verify.");
      navigate({ to: "/verify-email", search: { email, intent } });
      return;
    }
    toast.success("Account created!");
    goAfterSignup(POST_SIGNUP_ROUTE[intent]);
  };

  const handleGoogle = async () => {
    setSubmitAttempted(true);
    // Same identity-step validation as email/password signup, minus the
    // password fields (Google supplies credentials). We still require phone,
    // personal email, address, and (for business) business_* so the applier
    // can persist them into `profiles` after the OAuth round-trip.
    const oauthIssues = issues.filter(
      (i) => i.field !== "password" && i.field !== "confirm-password",
    );
    if (oauthIssues.length > 0) {
      toast.error(
        `Please fix ${oauthIssues.length} ${oauthIssues.length === 1 ? "field" : "fields"} before continuing with Google.`,
      );
      const first = oauthIssues[0].field;
      const el = document.getElementById(`field-${first}`) ?? document.getElementById(first);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!intent) return;
    stashPendingProfile();
    const returnTo = search.redirect
      ? `${siteOrigin()}/login?redirect=${encodeURIComponent(search.redirect)}`
      : siteOrigin();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: returnTo,
    });
    if (result.error) {
      toast.error("Could not sign up with Google");
      return;
    }
    if (result.redirected) return;
    goAfterSignup(POST_SIGNUP_ROUTE[intent]);
  };


  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/25";
  const invalidInputCls = (field: string) =>
    cn(inputCls, errorFor(field) && "border-destructive focus:border-destructive focus:ring-destructive/25");
  const sectionLabelCls =
    "block text-[11px] font-bold uppercase tracking-wider text-slate-500";
  const fieldLabelCls = "block text-xs font-semibold text-slate-700 mb-1";

  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-navy-50 px-3 py-3 md:px-4 md:py-10"
      style={{ fontFamily: "var(--font-manrope)" }}
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-xl md:rounded-2xl bg-white shadow-xl md:shadow-2xl shadow-navy-900/10 flex flex-col md:flex-row md:min-h-[720px] border border-slate-200/60">

        {/* Left: brand / value panel */}
        <aside
          className="hidden md:flex md:w-[38%] bg-navy-900 text-white p-10 flex-col justify-between relative overflow-hidden"
          style={{ fontFamily: "var(--font-manrope)" }}
        >
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-navy-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-navy-500/10 blur-3xl" />

          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <BrandLogo size={36} className="rounded-lg shadow-lg shadow-navy-500/30" />

              <span
                className="text-lg font-bold tracking-tight group-hover:text-navy-50"
                style={{ fontFamily: "var(--font-sora)" }}
              >
                MotorSales
              </span>
            </Link>

            <h2
              className="mt-12 text-3xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-sora)" }}
            >
              Join the Philippines' trusted motor marketplace.
            </h2>
            <p className="mt-3 text-sm text-slate-300/90 leading-relaxed">
              Buy, sell, and list vehicles, equipment, and services on one platform built for dealers, businesses, and private owners.
            </p>

            <ul className="mt-8 space-y-5">
              {[
                { t: "Verified inventory", d: "Authenticated listings from vetted dealers and private sellers." },
                { t: "Secure transactions", d: "Encrypted messaging and platform tools that protect both sides." },
                { t: "Nationwide reach", d: "Buyers and sellers across every region in the Philippines." },
              ].map((f) => (
                <li key={f.t} className="flex gap-3">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy-500/25">
                    <CheckCircle2 className="h-3.5 w-3.5 text-navy-50" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{f.t}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-8 pt-6 border-t border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Trusted marketplace
            </p>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Motorcycles · Cars · Trucks · Heavy equipment · Boats · Planes · Parts
            </p>
          </div>
        </aside>

        {/* Right: compact form */}
        <div className="flex-1 bg-white p-4 sm:p-6 md:p-10">
          <div className="mx-auto max-w-md">
            <header className="mb-3 md:mb-6">
              <div className="md:hidden mb-2 flex items-center gap-2">
                <BrandLogo size={28} className="rounded-md" />
                <span className="text-sm font-bold text-navy-900 tracking-tight" style={{ fontFamily: "var(--font-sora)" }}>MotorSales</span>
              </div>
              <h1
                className="text-xl md:text-2xl font-bold text-navy-900"
                style={{ fontFamily: "var(--font-sora)" }}
              >
                Create your account
              </h1>
              <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-navy-700 hover:text-navy-900 hover:underline">
                  Sign in
                </Link>
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4" noValidate>

              {/* Account type — segmented control */}
              <div id="field-intent">
                <label className={sectionLabelCls + " mb-2"}>Account type</label>
                <div
                  role="radiogroup"
                  aria-label="Account type"
                  className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
                >
                  {SIGNUP_TYPES.map((t) => {
                    const active = intent === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setIntent(t.id)}
                        className={cn(
                          "rounded-md px-2 py-2 text-[11px] sm:text-xs font-semibold transition",
                          active
                            ? "bg-white text-navy-900 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-navy-700 hover:bg-white/60",
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {intent && intentMeta?.note && (
                  <p className="mt-2 text-[11px] text-slate-500 leading-snug">
                    {intentMeta.note}
                  </p>
                )}
                {errorFor("intent") && (
                  <p className="mt-1 text-xs text-destructive">{errorFor("intent")}</p>
                )}
              </div>

              <div
                className={cn(
                  "space-y-3 md:space-y-4 transition-opacity",
                  !intent && "pointer-events-none opacity-50",
                )}
                aria-disabled={!intent}
              >

                {/* Name pair */}
                <div className="grid grid-cols-2 gap-3">
                  <div id="field-firstName">
                    <label htmlFor="first-name" className={fieldLabelCls}>
                      First name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="first-name"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => markTouched("firstName")}
                      autoComplete="given-name"
                      placeholder="Juan"
                      aria-invalid={!!errorFor("firstName")}
                      className={invalidInputCls("firstName")}
                    />
                    {errorFor("firstName") && (
                      <p className="mt-1 text-[11px] text-destructive">{errorFor("firstName")}</p>
                    )}
                  </div>
                  <div id="field-lastName">
                    <label htmlFor="last-name" className={fieldLabelCls}>
                      Last name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="last-name"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => markTouched("lastName")}
                      autoComplete="family-name"
                      placeholder="Dela Cruz"
                      aria-invalid={!!errorFor("lastName")}
                      className={invalidInputCls("lastName")}
                    />
                    {errorFor("lastName") && (
                      <p className="mt-1 text-[11px] text-destructive">{errorFor("lastName")}</p>
                    )}
                  </div>
                </div>

                {/* Mobile + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div id="field-phone">
                    <label htmlFor="phone" className={fieldLabelCls}>
                      Mobile <span className="text-destructive">*</span>
                    </label>
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
                      <p className="mt-1 text-[11px] text-destructive">{errorFor("phone")}</p>
                    ) : phoneNational.trim() ? (
                      <p className="mt-1 text-[10px] text-slate-400 font-mono">
                        {phoneValid ? (
                          <span className="text-emerald-600">✓ {phoneE164}</span>
                        ) : phoneE164 ? (
                          <span>Preview: {phoneE164}{phoneMessage ? ` — ${phoneMessage}` : ""}</span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Pick country, then enter your number.
                      </p>
                    )}
                  </div>
                  <div id="field-email">
                    <label htmlFor="email" className={fieldLabelCls}>
                      Email <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => markTouched("email")}
                      autoComplete="email"
                      placeholder="you@example.com"
                      aria-invalid={!!errorFor("email")}
                      className={invalidInputCls("email")}
                    />
                    {errorFor("email") && (
                      <p className="mt-1 text-[11px] text-destructive">{errorFor("email")}</p>
                    )}
                    {isStaffEmail(email) && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        {STAFF_EMAIL_DOMAIN} is reserved for 365 employees.
                      </p>
                    )}
                  </div>
                </div>

                {/* Location cascade — City / Region / Province / City */}
                <div className="pt-1 md:pt-2 border-t border-slate-100">
                  <div className="mb-1.5 md:mb-2 flex items-center justify-between">
                    <label className={sectionLabelCls}>Location</label>
                  </div>

                  <div id="field-city">
                    <LocationPicker
                      value={location}
                      onChange={(v) => {
                        setLocation(v);
                        markTouched("city");
                      }}
                      showBarangay={false}
                    />
                    {errorFor("city") && (
                      <p className="mt-1 text-[11px] text-destructive">{errorFor("city")}</p>
                    )}
                  </div>
                </div>

                {/* Personal address (only when not business-like) */}
                {!isBusinessLike && (
                  <div className="grid grid-cols-3 gap-3">
                    <div id="field-street-address" className="col-span-2">
                      <label htmlFor="street-address" className={fieldLabelCls}>
                        Street address <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="street-address"
                        value={streetAddress}
                        onChange={(e) => {
                          setStreetAddress(e.target.value);
                          if (e.target.value.length > 0) markTouched("street-address");
                        }}
                        onBlur={() => markTouched("street-address")}
                        placeholder="123 Rizal Ave, Brgy. San Jose"
                        autoComplete="street-address"
                        aria-invalid={!!errorFor("street-address")}
                        className={invalidInputCls("street-address")}
                      />
                      {errorFor("street-address") && (
                        <p className="mt-1 text-[11px] text-destructive">{errorFor("street-address")}</p>
                      )}
                      <AddressChecklist
                        active={touched["street-address"] || streetAddress.length > 0}
                        items={[
                          { label: "House / unit number", ok: addrHasNumber(streetAddress) },
                          { label: "Street name", ok: addrHasStreetName(streetAddress) },
                          { label: "At least 5 characters", ok: addrLongEnough(streetAddress) },
                        ]}
                      />
                    </div>
                    <div id="field-postal-code">
                      <label htmlFor="postal-code" className={fieldLabelCls}>
                        Postal <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="postal-code"
                        value={postalCode}
                        onChange={(e) => {
                          setPostalCode(e.target.value);
                          if (e.target.value.length > 0) markTouched("postal-code");
                        }}
                        onBlur={() => markTouched("postal-code")}
                        placeholder="1000"
                        autoComplete="postal-code"
                        aria-invalid={!!errorFor("postal-code")}
                        className={invalidInputCls("postal-code")}
                      />
                      {errorFor("postal-code") && (
                        <p className="mt-1 text-[11px] text-destructive">{errorFor("postal-code")}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Business section */}
                {isBusinessLike && (
                  <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <p className={sectionLabelCls}>
                      {intent === "service_provider" ? "Service details" : "Business details"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div id="field-businessName">
                        <label htmlFor="business-name" className={fieldLabelCls}>
                          {intent === "service_provider" ? "Service name" : "Business name"}{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="business-name"
                          required
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          onBlur={() => markTouched("businessName")}
                          placeholder={
                            intent === "service_provider"
                              ? "Reyes Towing Services"
                              : "Manila Auto Hub"
                          }
                          aria-invalid={!!errorFor("businessName")}
                          className={invalidInputCls("businessName")}
                        />
                        {errorFor("businessName") && (
                          <p className="mt-1 text-[11px] text-destructive">{errorFor("businessName")}</p>
                        )}
                      </div>
                      <div id="field-businessKind">
                        <label htmlFor="business-kind" className={fieldLabelCls}>
                          Category <span className="text-destructive">*</span>
                        </label>
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
                            className={cn(
                              "w-full rounded-lg border-slate-200 bg-white text-sm h-auto py-2",
                              errorFor("businessKind") && "border-destructive",
                            )}
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
                          <p className="mt-1 text-[11px] text-destructive">{errorFor("businessKind")}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div id="field-business-address" className="col-span-2">
                        <label htmlFor="business-address" className={fieldLabelCls}>
                          Street address <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="business-address"
                          value={businessAddress}
                          onChange={(e) => {
                            setBusinessAddress(e.target.value);
                            if (e.target.value.length > 0) markTouched("business-address");
                          }}
                          onBlur={() => markTouched("business-address")}
                          placeholder="123 Rizal Ave, Brgy. San Jose"
                          autoComplete="street-address"
                          aria-invalid={!!errorFor("business-address")}
                          className={invalidInputCls("business-address")}
                        />
                        {errorFor("business-address") && (
                          <p className="mt-1 text-[11px] text-destructive">{errorFor("business-address")}</p>
                        )}
                        <AddressChecklist
                          active={touched["business-address"] || businessAddress.length > 0}
                          items={[
                            { label: "Building / unit number", ok: addrHasNumber(businessAddress) },
                            { label: "Street name", ok: addrHasStreetName(businessAddress) },
                            { label: "At least 5 characters", ok: addrLongEnough(businessAddress) },
                          ]}
                        />
                      </div>
                      <div id="field-business-postal">
                        <label htmlFor="business-postal" className={fieldLabelCls}>
                          Postal <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="business-postal"
                          value={businessPostalCode}
                          onChange={(e) => {
                            setBusinessPostalCode(e.target.value);
                            if (e.target.value.length > 0) markTouched("business-postal");
                          }}
                          onBlur={() => markTouched("business-postal")}
                          placeholder="1000"
                          autoComplete="postal-code"
                          aria-invalid={!!errorFor("business-postal")}
                          className={invalidInputCls("business-postal")}
                        />
                        {errorFor("business-postal") && (
                          <p className="mt-1 text-[11px] text-destructive">{errorFor("business-postal")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Password pair */}
                <div className="grid grid-cols-2 gap-3 pt-1 md:pt-2 border-t border-slate-100">
                  <div id="field-password">
                    <label htmlFor="password" className={fieldLabelCls}>
                      Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => markTouched("password")}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        aria-invalid={!!errorFor("password")}
                        className={cn(invalidInputCls("password"), "pr-9")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-navy-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {errorFor("password") ? (
                      <p className="mt-1 text-[11px] text-destructive">{errorFor("password")}</p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400">Min 8 characters.</p>
                    )}
                  </div>
                  <div id="field-confirm-password">
                    <label htmlFor="confirm-password" className={fieldLabelCls}>
                      Confirm <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => markTouched("confirm-password")}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        aria-invalid={!!errorFor("confirm-password")}
                        className={cn(invalidInputCls("confirm-password"), "pr-9")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-navy-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {errorFor("confirm-password") && (
                      <p className="mt-1 text-[11px] text-destructive">{errorFor("confirm-password")}</p>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div id="field-terms" className="flex items-start gap-2 pt-1">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(v) => {
                      setAgreed(v === true);
                      markTouched("terms");
                    }}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="terms"
                    className="text-[11px] leading-snug text-slate-500"
                  >
                    I agree to the{" "}
                    <Link to="/terms" className="font-semibold text-navy-700 hover:underline">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="font-semibold text-navy-700 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>
                {errorFor("terms") && (
                  <p className="text-[11px] text-destructive -mt-2">{errorFor("terms")}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !intent}
                  className={cn(
                    "w-full rounded-lg bg-navy-900 py-2.5 text-sm font-bold text-white shadow-lg shadow-navy-900/20 transition hover:bg-navy-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                  style={{ fontFamily: "var(--font-sora)" }}
                >
                  {submitting
                    ? "Creating account…"
                    : intent
                      ? `Create ${intentMeta?.label.toLowerCase()} account`
                      : "Choose an account type"}
                </button>

                {/* Divider */}
                <div className="relative py-0">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Or register with
                    </span>
                  </div>
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={!intent}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

