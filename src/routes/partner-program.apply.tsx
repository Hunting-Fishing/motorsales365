import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitPartnerProgramApplication } from "@/lib/partner-program.functions";

const TITLE = "Apply — 365 Partner Program";
const DESCRIPTION =
  "Apply to become an independent 365 Motor Sales Partner. Share your QR code or referral link and earn commissions on real conversions.";

export const Route = createFileRoute("/partner-program/apply")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: ApplyPage,
});

const PLATFORMS = ["TikTok", "Facebook", "Instagram", "YouTube", "In person", "Blog", "Other"];
const AUDIENCE = ["<1k", "1k–10k", "10k–50k", "50k–250k", "250k+"];

function ApplyPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitPartnerProgramApplication);
  const [submitting, setSubmitting] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    region: "",
    channel_type: "individual" as "individual" | "influencer" | "shop" | "community" | "other",
    audience_band: "",
    pitch: "",
    agreed_terms: false,
    agreed_not_employee: false,
  });

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreed_terms || !form.agreed_not_employee) {
      toast.error("Please agree to the terms to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          city: form.city || null,
          region: form.region || null,
          channel_type: form.channel_type,
          platforms,
          audience_band: form.audience_band || null,
          pitch: form.pitch || null,
          agreed_terms: true,
          agreed_not_employee: true,
        } as any,
      });
      toast.success("Application submitted. We'll be in touch soon.");
      navigate({ to: "/partner-program" });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Apply to the 365 Partner Program</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Independent partners only. Read the{" "}
          <Link to="/partner-program/terms" className="text-primary underline">
            Partner Terms
          </Link>{" "}
          before applying.
        </p>

        <Card className="mt-6 p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="full_name">Full name *</Label>
                <Input
                  id="full_name"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                />
              </div>
              <div>
                <Label>Channel type *</Label>
                <Select
                  value={form.channel_type}
                  onValueChange={(v) => setForm({ ...form, channel_type: v as any })}
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
                onValueChange={(v) => setForm({ ...form, audience_band: v })}
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
                onChange={(e) => setForm({ ...form, pitch: e.target.value })}
              />
            </div>

            <div className="space-y-2 rounded-md border border-border bg-secondary/30 p-3">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={form.agreed_terms}
                  onCheckedChange={(v) => setForm({ ...form, agreed_terms: !!v })}
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
                  onCheckedChange={(v) => setForm({ ...form, agreed_not_employee: !!v })}
                />
                <span>
                  I understand I am an independent partner and{" "}
                  <strong>not a 365 Motor Sales employee, agent, or representative</strong>.
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
