import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitPartnerProgramApplication } from "@/lib/partner-program.functions";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Promoter Program Application — 365 MotorSales";
const DESCRIPTION =
  "Apply to the limited, approval-only 365 MotorSales Promoter Program. Approved promoters get a personal QR code and referral link.";

export const Route = createFileRoute("/partner-program/apply")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  // Auth guard: the underlying server fn requires auth, so submitting without
  // a session used to fail silently on the client.
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({
        to: "/signup",
        search: { type: "buyer", redirect: location.pathname } as any,
      });
    }
  },
  component: ApplyPage,
});

const PLATFORMS = ["TikTok", "Facebook", "Instagram", "YouTube", "In person", "Blog", "Other"];
const AUDIENCE = ["<1k", "1k–10k", "10k–50k", "50k–250k", "250k+"];
const PAYOUT_METHODS = [
  { id: "gcash", label: "GCash" },
  { id: "maya", label: "Maya" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "cash", label: "Cash (in person)" },
] as const;

function ApplyPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitPartnerProgramApplication);
  const [submitting, setSubmitting] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birth_date: "",
    occupation: "",
    school_or_company: "",
    address_line: "",
    city: "",
    region: "",
    postal_code: "",
    channel_type: "individual" as "individual" | "influencer" | "shop" | "community" | "other",
    audience_band: "",
    pitch: "",
    payout_method: "gcash" as (typeof PAYOUT_METHODS)[number]["id"],
    payout_account_name: "",
    payout_account_number: "",
    wants_shop_manager: false,
    agreed_terms: false,
    agreed_not_employee: false,
    agreed_early_release: false,
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreed_terms || !form.agreed_not_employee || !form.agreed_early_release) {
      toast.error("Please tick all three acknowledgements to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          birth_date: form.birth_date || null,
          occupation: form.occupation || null,
          school_or_company: form.school_or_company || null,
          address_line: form.address_line || null,
          city: form.city || null,
          region: form.region || null,
          postal_code: form.postal_code || null,
          channel_type: form.channel_type,
          platforms,
          audience_band: form.audience_band || null,
          pitch: form.pitch || null,
          payout_method: form.payout_method,
          payout_account_name: form.payout_account_name || null,
          payout_account_number: form.payout_account_number || null,
          wants_shop_manager: form.wants_shop_manager,
          agreed_terms: true,
          agreed_not_employee: true,
          agreed_early_release: true,
        } as any,
      });
      toast.success("Application submitted. We'll review it and email you once approved.");
      navigate({ to: "/dashboard/partner-program" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Promoter Program application</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The 365 Promoter Program is a limited, application-only program for people who actively
          promote 365 MotorSales. It is not part of normal account sign-up. Approved promoters
          receive a personal QR code and referral link, and are paid per verified referral at the
          rates set by 365 on approval. Applications are reviewed individually and places are
          limited. Please read the{" "}
          <Link to="/partner-program/terms" className="text-primary underline">
            Partner Terms
          </Link>{" "}
          before applying.
        </p>

        <div className="mt-4 flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            <strong>Early release notice.</strong> 365 Motor Sales is in an early release and heavy
            testing phase. Features, payout rates and tracking may change while we stabilise the
            platform, and occasional bugs are expected. Report anything unusual so we can fix it.
          </p>
        </div>

        <Card className="mt-6 p-6">
          <form onSubmit={onSubmit} className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                About you
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">First name *</Label>
                  <Input
                    id="first_name"
                    required
                    value={form.first_name}
                    onChange={(e) => set({ first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last name *</Label>
                  <Input
                    id="last_name"
                    required
                    value={form.last_name}
                    onChange={(e) => set({ last_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => set({ email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Mobile number *</Label>
                  <Input
                    id="phone"
                    required
                    placeholder="09XX XXX XXXX"
                    value={form.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="birth_date">Date of birth</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => set({ birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    placeholder="Student, freelancer, shop owner…"
                    value={form.occupation}
                    onChange={(e) => set({ occupation: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="school_or_company">School or company</Label>
                  <Input
                    id="school_or_company"
                    value={form.school_or_company}
                    onChange={(e) => set({ school_or_company: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Address
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="address_line">Street address</Label>
                  <Input
                    id="address_line"
                    value={form.address_line}
                    onChange={(e) => set({ address_line: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City / municipality</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => set({ city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="region">Region / province</Label>
                  <Input
                    id="region"
                    value={form.region}
                    onChange={(e) => set({ region: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal code</Label>
                  <Input
                    id="postal_code"
                    value={form.postal_code}
                    onChange={(e) => set({ postal_code: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                How you'll promote
              </h2>
              <div>
                <Label>Channel type *</Label>
                <Select
                  value={form.channel_type}
                  onValueChange={(v) => set({ channel_type: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="influencer">Influencer / creator</SelectItem>
                    <SelectItem value="shop">Shop / business</SelectItem>
                    <SelectItem value="community">Community / club</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Primary platforms</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        platforms.includes(p)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Audience size</Label>
                <Select
                  value={form.audience_band}
                  onValueChange={(v) => set({ audience_band: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pitch">Short pitch (max 500 chars)</Label>
                <Textarea
                  id="pitch"
                  maxLength={500}
                  rows={4}
                  placeholder="How do you plan to share 365 Motor Sales with your audience?"
                  value={form.pitch}
                  onChange={(e) => set({ pitch: e.target.value })}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                How you want to be paid
              </h2>
              <div className="flex flex-wrap gap-2">
                {PAYOUT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => set({ payout_method: m.id })}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium ${
                      form.payout_method === m.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {form.payout_method !== "cash" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="payout_account_name">Account name</Label>
                    <Input
                      id="payout_account_name"
                      value={form.payout_account_name}
                      onChange={(e) => set({ payout_account_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payout_account_number">
                      {form.payout_method === "bank_transfer" ? "Account number" : "Mobile number"}
                    </Label>
                    <Input
                      id="payout_account_number"
                      value={form.payout_account_number}
                      onChange={(e) => set({ payout_account_number: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Request free Shop Manager access</p>
                  <p className="text-xs text-muted-foreground">
                    Optional. Admins decide on approval — useful if you also help shops onboard and
                    test the platform.
                  </p>
                </div>
                <Switch
                  checked={form.wants_shop_manager}
                  onCheckedChange={(v) => set({ wants_shop_manager: v })}
                />
              </div>
            </section>

            <div className="space-y-2 rounded-md border border-border bg-secondary/30 p-3">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={form.agreed_terms}
                  onCheckedChange={(v) => set({ agreed_terms: !!v })}
                />
                <span>
                  I have read and agree to the{" "}
                  <Link to="/partner-program/terms" className="text-primary underline">
                    Partner Program Terms
                  </Link>
                  .
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={form.agreed_not_employee}
                  onCheckedChange={(v) => set({ agreed_not_employee: !!v })}
                />
                <span>
                  I understand I am{" "}
                  <strong>not a 365 Motor Sales employee, agent, or representative</strong>.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={form.agreed_early_release}
                  onCheckedChange={(v) => set({ agreed_early_release: !!v })}
                />
                <span>
                  I understand the platform is in <strong>early release and heavy testing</strong>,
                  and that features, tracking and payout rates may change.
                </span>
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          </form>
        </Card>
      </div>
    </SiteLayout>
  );
}
