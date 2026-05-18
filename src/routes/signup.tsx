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
import { AccountTypeGrid, SIGNUP_TYPES, type SignupIntent } from "@/components/signup/account-type-grid";
import { LocationPicker, type LocationValue } from "@/components/location-picker";

type SignupSearch = { type?: SignupIntent };

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): SignupSearch => {
    const t = search.type;
    const valid = SIGNUP_TYPES.map((s) => s.id) as string[];
    return { type: typeof t === "string" && valid.includes(t) ? (t as SignupIntent) : undefined };
  },
  component: SignupPage,
});

const POST_SIGNUP_ROUTE: Record<SignupIntent, string> = {
  buyer: "/dashboard",
  private_seller: "/sell",
  business: "/businesses/submit",
  service_provider: "/businesses/submit",
};

const BUSINESS_KIND_OPTIONS: { value: string; label: string; forIntent?: SignupIntent }[] = [
  { value: "dealer", label: "Dealership / Showroom", forIntent: "business" },
  { value: "parts_shop", label: "Parts shop", forIntent: "business" },
  { value: "rental", label: "Rental", forIntent: "business" },
  { value: "repair_shop", label: "Repair shop", forIntent: "service_provider" },
  { value: "towing", label: "Towing", forIntent: "service_provider" },
  { value: "body_shop", label: "Body shop", forIntent: "service_provider" },
  { value: "carwash", label: "Carwash / detailing", forIntent: "service_provider" },
  { value: "salvage", label: "Salvage yard", forIntent: "service_provider" },
  { value: "insurance", label: "Insurance" },
  { value: "corporate", label: "Corporate / fleet" },
  { value: "other", label: "Other" },
];

function normalizePhPhone(raw: string): string | null {
  const d = raw.replace(/[^0-9+]/g, "");
  if (!d) return null;
  if (d.startsWith("+")) return /^\+\d{8,15}$/.test(d) ? d : null;
  if (/^09\d{9}$/.test(d)) return "+63" + d.slice(1);
  if (/^9\d{9}$/.test(d)) return "+63" + d;
  if (/^63\d{10}$/.test(d)) return "+" + d;
  return null;
}

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/signup" });

  const [intent, setIntent] = useState<SignupIntent | null>(search.type ?? null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessKind, setBusinessKind] = useState<string>("");
  const [location, setLocation] = useState<LocationValue>({ region: null, province: null, city: null, barangay: null });
  const [refCode, setRefCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const isBusinessLike = intent === "business" || intent === "service_provider";
  const intentMeta = useMemo(() => SIGNUP_TYPES.find((s) => s.id === intent), [intent]);
  const kindOptions = useMemo(
    () => BUSINESS_KIND_OPTIONS.filter((o) => !o.forIntent || o.forIntent === intent),
    [intent],
  );

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneNormalized = phone.trim() ? normalizePhPhone(phone) : "";
  const phoneValid = phoneNormalized !== null;

  type Issue = { field: string; label: string; message: string };
  const issues = useMemo<Issue[]>(() => {
    const list: Issue[] = [];
    if (!intent) list.push({ field: "intent", label: "Account type", message: "Choose what kind of account you'd like." });
    if (!firstName.trim()) list.push({ field: "firstName", label: "First name", message: "Enter your first name." });
    if (!lastName.trim()) list.push({ field: "lastName", label: "Last name", message: "Enter your last name." });
    if (!email.trim()) list.push({ field: "email", label: "Email", message: "Enter your email address." });
    else if (!emailValid) list.push({ field: "email", label: "Email", message: "Enter a valid email address." });
    if (phone.trim() && !phoneValid) list.push({ field: "phone", label: "Mobile", message: "Use a PH mobile format like 09XX XXX XXXX, or leave it blank." });
    if (!location.city) list.push({ field: "city", label: "City / Town", message: "Choose your city or town." });
    if (isBusinessLike && !businessName.trim()) {
      list.push({ field: "businessName", label: intent === "service_provider" ? "Service name" : "Business name", message: "Required for business and service accounts." });
    }
    if (isBusinessLike && !businessKind) {
      list.push({ field: "businessKind", label: "Category", message: "Pick the category that best describes your business." });
    }
    if (!password) list.push({ field: "password", label: "Password", message: "Choose a password." });
    else if (password.length < 8) list.push({ field: "password", label: "Password", message: "Password must be at least 8 characters." });
    if (!agreed) list.push({ field: "terms", label: "Terms", message: "Agree to the Terms and Privacy Policy to continue." });
    return list;
  }, [intent, firstName, lastName, email, emailValid, phone, phoneValid, location.city, isBusinessLike, businessName, businessKind, password, agreed]);

  const errorFor = (field: string) => {
    if (!submitAttempted && !touched[field]) return null;
    return issues.find((i) => i.field === field)?.message ?? null;
  };
  const invalidCls = (field: string) => (errorFor(field) ? "border-destructive focus-visible:ring-destructive" : "");

  useEffect(() => {
    const c = getCreditedCode();
    if (c) setRefCode(c);
  }, []);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  // Reset business_kind when switching intent
  useEffect(() => {
    setBusinessKind("");
  }, [intent]);

  const stashPendingProfile = () => {
    try {
      const payload = {
        intent,
        full_name: fullName || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        business_name: isBusinessLike ? businessName.trim() || undefined : undefined,
        business_address: isBusinessLike ? businessAddress.trim() || undefined : undefined,
        business_kind: isBusinessLike ? businessKind || undefined : undefined,
        region: location.region ?? undefined,
        province: location.province ?? undefined,
        city: location.city ?? undefined,
        is_business: isBusinessLike,
      };
      window.localStorage.setItem("signup.pending", JSON.stringify(payload));
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent) { toast.error("Please choose what kind of account you'd like."); return; }
    if (!firstName.trim() || !lastName.trim()) { toast.error("Please enter your first and last name."); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (isBusinessLike && !businessName.trim()) { toast.error("Please enter your business name."); return; }
    if (!location.city) { toast.error("Please choose your city or town."); return; }
    if (phone.trim() && !normalizePhPhone(phone)) {
      toast.error("Please enter a valid Philippine mobile number, or leave it blank.");
      return;
    }
    if (!agreed) { toast.error("Please agree to the Terms and Privacy Policy."); return; }

    setSubmitting(true);
    stashPendingProfile();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          business_name: isBusinessLike ? businessName.trim() : undefined,
          business_address: isBusinessLike ? (businessAddress.trim() || undefined) : undefined,
          business_kind: isBusinessLike ? (businessKind || undefined) : undefined,
          signup_city: location.city ?? undefined,
          signup_region: location.region ?? undefined,
          signup_province: location.province ?? undefined,
          referral_code: refCode || undefined,
          signup_intent: intent,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created — check your email to verify.");
    navigate({ to: POST_SIGNUP_ROUTE[intent] });
  };

  const handleGoogle = async () => {
    if (!intent) { toast.error("Please choose what kind of account you'd like first."); return; }
    if (!agreed) { toast.error("Please agree to the Terms and Privacy Policy first."); return; }
    stashPendingProfile();
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) { toast.error("Could not sign up with Google"); return; }
    if (result.redirected) return;
    navigate({ to: POST_SIGNUP_ROUTE[intent] });
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Create your 365 MotorSales account</h1>
          <p className="mt-2 text-muted-foreground">
            Pick what brings you here — we'll tailor your dashboard around it.
          </p>
        </header>

        <section aria-labelledby="account-type-heading" className="mb-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="account-type-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2. Your details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first-name">First name</Label>
              <Input id="first-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </div>
            <div>
              <Label htmlFor="last-name">Last name</Label>
              <Input id="last-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">Mobile (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="09XX XXX XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
              <p className="mt-1 text-xs text-muted-foreground">PH mobile format — we'll store it as +63.</p>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">City / Town</Label>
            <LocationPicker value={location} onChange={setLocation} showBarangay={false} />
          </div>

          {isBusinessLike && (
            <div className="space-y-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business details</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="business-name">
                    {intent === "service_provider" ? "Service name" : "Business / dealer name"}
                  </Label>
                  <Input
                    id="business-name"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder={intent === "service_provider" ? "e.g. Reyes Towing Services" : "e.g. Manila Auto Hub"}
                  />
                </div>
                <div>
                  <Label htmlFor="business-kind">Category</Label>
                  <Select value={businessKind} onValueChange={setBusinessKind}>
                    <SelectTrigger id="business-kind">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {kindOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="business-address">Street address (optional)</Label>
                <Input
                  id="business-address"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. 123 Rizal Ave, Brgy. San Jose"
                  autoComplete="street-address"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  You can skip this for now, but your account won't go live or appear in the directory until a business address is saved.
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
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
            <p className="mt-1 text-xs text-muted-foreground">At least 8 characters. Use a mix of letters and numbers.</p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
            <Label htmlFor="terms" className="text-sm font-normal leading-relaxed text-muted-foreground">
              I agree to the{" "}
              <Link to="/terms" className="font-medium text-primary underline">Terms</Link> and{" "}
              <Link to="/privacy" className="font-medium text-primary underline">Privacy Policy</Link>.
            </Label>
          </div>

          <Button type="submit" disabled={submitting || !intent} className="w-full" size="lg">
            {submitting ? "Creating account…" : intent ? `Create ${intentMeta?.label.toLowerCase()} account` : "Choose an account type to continue"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" onClick={handleGoogle} disabled={!intent} className="w-full">
            Continue with Google
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </SiteLayout>
  );
}
