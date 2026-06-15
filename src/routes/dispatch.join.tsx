import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { joinDispatchNetwork } from "@/lib/dispatch.functions";
import { PH_REGIONS } from "@/lib/format";

import { toast } from "sonner";

const VALID_PRICES = new Set([
  "dispatch_solo_monthly",
  "dispatch_team_monthly",
  "dispatch_unlimited_monthly",
]);

const PLAN_DETAILS: Record<string, { name: string; price: string; drivers: string; perks: string[] }> = {
  dispatch_solo_monthly: {
    name: "Solo",
    price: "₱250 / month",
    drivers: "1 driver",
    perks: ["Live job alerts in your region", "Accept or pass on each request", "Cancel anytime"],
  },
  dispatch_team_monthly: {
    name: "Team",
    price: "₱500 / month",
    drivers: "Up to 5 drivers",
    perks: ["Dispatch to multiple drivers", "Job history & reporting", "Priority in matched regions"],
  },
  dispatch_unlimited_monthly: {
    name: "Unlimited",
    price: "₱1,000 / month",
    drivers: "Unlimited drivers",
    perks: ["Nationwide coverage", "All regions included", "Top-priority dispatch"],
  },
};


const SERVICES = [
  { id: "tow_car", label: "Car towing" },
  { id: "tow_motorcycle", label: "Motorcycle towing" },
  { id: "flatbed", label: "Flatbed" },
  { id: "long_distance", label: "Long-distance / inter-region" },
  { id: "heavy_duty", label: "Heavy-duty (trucks, buses)" },
  { id: "winch_recovery", label: "Recovery / winch-out" },
] as const;

const PAYMENTS = [
  { id: "cash", label: "Cash" },
  { id: "gcash", label: "GCash" },
  { id: "maya", label: "Maya" },
  { id: "card", label: "Card" },
  { id: "bank_transfer", label: "Bank transfer" },
] as const;

export const Route = createFileRoute("/dispatch/join")({
  validateSearch: (search: Record<string, unknown>): { priceId?: string } => ({
    priceId: typeof search.priceId === "string" ? search.priceId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Join 365 Dispatch" },
      { name: "description", content: "Sign up to receive tow & roadside jobs through 365 Dispatch." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DispatchJoin,
});

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function DispatchJoin() {
  const { priceId } = Route.useSearch();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const submit = useServerFn(joinDispatchNetwork);

  const [companyName, setCompanyName] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [extraRegions, setExtraRegions] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [driverCount, setDriverCount] = useState(1);
  const [services, setServices] = useState<string[]>([]);
  const [payments, setPayments] = useState<string[]>(["cash", "gcash"]);
  const [available24_7, setAvailable24_7] = useState(false);
  const [flatBase, setFlatBase] = useState("");
  const [perKm, setPerKm] = useState("");
  const [notes, setNotes] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", search: { redirect: `/dispatch/join?priceId=${priceId ?? ""}` } as any });
    }
  }, [loading, user, navigate, priceId]);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const validPrice = priceId && VALID_PRICES.has(priceId);

  if (!validPrice) {
    return (
      <SiteLayout>
        <section className="container mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold">Pick a Dispatch plan first</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose Solo, Team, or Unlimited to continue.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dispatch" hash="plans">View plans</Link>
          </Button>
        </section>
      </SiteLayout>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await submit({
        data: {
          companyName,
          operatorName,
          phone,
          email: email || undefined,
          region,
          regions: extraRegions,
          city: city || undefined,
          driverCount,
          services,
          payments,
          available24_7,
          flatBasePhp: flatBase ? Number(flatBase) : undefined,
          perKmPhp: perKm ? Number(perKm) : undefined,
          notes: notes || undefined,
          agreeTerms,
        },
      });
      toast.success("Profile saved. Continue to subscribe.");
      navigate({ to: "/dispatch/checkout", search: { priceId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/dispatch" hash="plans">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to plans
          </Link>
        </Button>
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary">
            Step 1 of 2 · Provider profile
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            Join the 365 Dispatch network
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selected plan: <strong className="text-foreground">{PLAN_LABEL[priceId!]}</strong>.
            Tell us about your operation so we can route jobs to you. You'll subscribe on the next step.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">Business</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="company">Company / shop name *</Label>
                <Input id="company" required maxLength={120} value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. JR Towing Services" />
              </div>
              <div>
                <Label htmlFor="operator">Operator / contact name *</Label>
                <Input id="operator" required maxLength={120} value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <Label htmlFor="phone">Mobile (PH) *</Label>
                <Input id="phone" required inputMode="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="09171234567" />
              </div>
              <div>
                <Label htmlFor="email">Contact email</Label>
                <Input id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="ops@example.com" />
              </div>
              <div>
                <Label htmlFor="logo">Logo URL (optional)</Label>
                <Input id="logo" value={""} disabled placeholder="Upload from dashboard after signup" />
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">Coverage</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Primary region *</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    {PH_REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city">City / municipality</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Quezon City" />
              </div>
            </div>
            <div>
              <Label>Additional regions you serve (optional)</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PH_REGIONS.filter((r) => r !== region).map((r) => (
                  <label key={r} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={extraRegions.includes(r)}
                      onCheckedChange={() => setExtraRegions((cur) => toggle(cur, r))}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">Operation</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="drivers">Number of drivers</Label>
                <Input id="drivers" type="number" min={1} max={999} value={driverCount}
                  onChange={(e) => setDriverCount(Number(e.target.value) || 1)} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Checkbox id="247" checked={available24_7}
                  onCheckedChange={(v) => setAvailable24_7(v === true)} />
                <Label htmlFor="247" className="cursor-pointer">Available 24/7</Label>
              </div>
            </div>
            <div>
              <Label>Services offered *</Label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SERVICES.map((s) => (
                  <label key={s.id} className="flex items-start gap-2 text-sm">
                    <Checkbox checked={services.includes(s.id)}
                      onCheckedChange={() => setServices((cur) => toggle(cur, s.id))} />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Accepted payments</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {PAYMENTS.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={payments.includes(p.id)}
                      onCheckedChange={() => setPayments((cur) => toggle(cur, p.id))} />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-semibold">Pricing (optional)</h2>
            <p className="text-xs text-muted-foreground">
              Helps the dispatcher show realistic estimates. You can edit anytime from your provider dashboard.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="flat">Flat base fee (₱)</Label>
                <Input id="flat" type="number" min={0} value={flatBase}
                  onChange={(e) => setFlatBase(e.target.value)} placeholder="1500" />
              </div>
              <div>
                <Label htmlFor="km">Per-km rate (₱)</Label>
                <Input id="km" type="number" min={0} value={perKm}
                  onChange={(e) => setPerKm(e.target.value)} placeholder="50" />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes for dispatchers</Label>
              <Textarea id="notes" maxLength={1000} value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Equipment, truck types, service hours, anything else dispatchers should know." />
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={agreeTerms}
                onCheckedChange={(v) => setAgreeTerms(v === true)} />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="underline">Terms</Link> and{" "}
                <Link to="/privacy" className="underline">Privacy Policy</Link>, and confirm
                I'm authorised to dispatch the drivers and equipment listed above.
              </span>
            </label>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={busy || !agreeTerms}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue → Subscribe
            </Button>
            <Button asChild variant="ghost" size="lg" type="button">
              <Link to="/dispatch" hash="plans">Cancel</Link>
            </Button>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}
