import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/signup" });

  const [intent, setIntent] = useState<SignupIntent | null>(search.type ?? null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState<LocationValue>({ region: null, province: null, city: null, barangay: null });
  const [refCode, setRefCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isBusinessLike = intent === "business" || intent === "service_provider";
  const intentMeta = useMemo(() => SIGNUP_TYPES.find((s) => s.id === intent), [intent]);

  useEffect(() => {
    const c = getCreditedCode();
    if (c) setRefCode(c);
  }, []);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const stashPendingProfile = (overrides?: { intent?: SignupIntent; businessName?: string }) => {
    try {
      const payload = {
        intent: overrides?.intent ?? intent,
        full_name: fullName || undefined,
        phone: phone || undefined,
        business_name: overrides?.businessName ?? (isBusinessLike ? businessName : undefined),
        region: location.region ?? undefined,
        province: location.province ?? undefined,
        city: location.city ?? undefined,
        is_business: overrides?.intent
          ? overrides.intent === "business" || overrides.intent === "service_provider"
          : isBusinessLike,
      };
      window.localStorage.setItem("signup.pending", JSON.stringify(payload));
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent) { toast.error("Please choose what kind of account you'd like."); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (isBusinessLike && !businessName.trim()) { toast.error("Please enter your business name."); return; }
    if (!location.city) { toast.error("Please choose your city or town."); return; }

    setSubmitting(true);
    stashPendingProfile();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
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

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2. Your details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" type="tel" placeholder="+63 9XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <Label className="mb-2 block">City / Town</Label>
            <LocationPicker value={location} onChange={setLocation} showBarangay={false} />
          </div>

          {isBusinessLike && (
            <div>
              <Label htmlFor="business-name">
                {intent === "service_provider" ? "Business / service name" : "Business / dealer name"}
              </Label>
              <Input
                id="business-name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={intent === "service_provider" ? "e.g. Reyes Towing Services" : "e.g. Manila Auto Hub"}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                You'll finish your full business profile after signup.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">At least 6 characters.</p>
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

          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link to="/terms" className="underline">Terms</Link> and{" "}
            <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </SiteLayout>
  );
}
