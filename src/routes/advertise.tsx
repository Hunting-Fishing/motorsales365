import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Megaphone, Target, BarChart3, Mail } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhoneInput } from "@/components/phone-input";
import { buildE164 } from "@/data/country-codes";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise with 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Reach buyers and sellers of cars, motorcycles, boats, airplanes, and heavy equipment across the Philippines. Inquire about ad placements.",
      },
    ],
  }),
  component: AdvertisePage,
});

const PLACEMENTS = [
  { value: "homepage_banner", label: "Homepage banner" },
  { value: "category_banner", label: "Category banner (Cars, Motorcycles, etc.)" },
  { value: "listing_sidebar", label: "Listing sidebar" },
  { value: "newsletter", label: "Newsletter sponsorship" },
  { value: "sponsored_post", label: "Sponsored post / featured business" },
  { value: "other", label: "Something else" },
] as const;

const todayIso = () => new Date().toISOString().slice(0, 10);

const inquirySchema = z.object({
  contact_name: z.string().trim().min(1, "Required").max(100, "Max 100 characters"),
  company: z.string().trim().max(120, "Max 120 characters").optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Invalid email").max(255),
  phone: z.string().trim().max(30, "Max 30 characters")
    .regex(/^[+\d][\d\s\-().]*$/u, "Digits, spaces, + - ( ) only").optional().or(z.literal("")),
  placement: z.enum(PLACEMENTS.map((p) => p.value) as [string, ...string[]]),
  budget_range: z.string().trim().max(60, "Max 60 characters").optional().or(z.literal("")),
  start_date: z.string().trim().refine(
    (v) => !v || v >= todayIso(),
    "Start date must be today or later",
  ).optional().or(z.literal("")),
  message: z.string().trim().min(10, "At least 10 characters").max(2000, "Max 2000 characters"),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof inquirySchema>, string>>;

function AdvertisePage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({
    contact_name: "",
    company: "",
    email: "",
    phone: "",
    placement: "homepage_banner" as (typeof PLACEMENTS)[number]["value"],
    budget_range: "",
    start_date: "",
    message: "",
  });

  const update = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = inquirySchema.safeParse(form);
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !fe[key]) fe[key] = issue.message;
      }
      setErrors(fe);
      toast.error("Please correct the highlighted fields.");
      return;
    }
    const v = parsed.data;
    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("ad_inquiries").insert({
      contact_name: v.contact_name,
      company: v.company || null,
      email: v.email,
      phone: v.phone || null,
      placement: v.placement as (typeof PLACEMENTS)[number]["value"],
      budget_range: v.budget_range || null,
      start_date: v.start_date || null,
      message: v.message,
      submitter_user_id: userData.user?.id ?? null,
      source_url: typeof window !== "undefined" ? window.location.href : null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Thanks! Our advertising team will be in touch shortly.");
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <Megaphone className="h-3.5 w-3.5" /> Advertise with us
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
              Put your brand in front of Filipino vehicle buyers and sellers.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              365 MotorSales is the Philippines' growing marketplace for cars, motorcycles, boats,
              airplanes, and heavy equipment. We work with dealers, financiers, insurers, parts brands,
              and service providers across the country.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Feature
                icon={<Target className="h-5 w-5" />}
                title="Targeted placements"
                body="Run by category, region, or audience — buyers, sellers, or both."
              />
              <Feature
                icon={<BarChart3 className="h-5 w-5" />}
                title="Transparent metrics"
                body="Impressions, click-throughs, and basic audience reporting on every campaign."
              />
              <Feature
                icon={<Megaphone className="h-5 w-5" />}
                title="Multiple formats"
                body="Homepage and category banners, sidebar, newsletter, and sponsored business posts."
              />
              <Feature
                icon={<Mail className="h-5 w-5" />}
                title="Personal service"
                body="A real person replies — we tailor proposals to your goals and budget."
              />
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Prefer email?{" "}
              <a className="text-primary underline" href="mailto:partners@365motorsales.ph">
                partners@365motorsales.ph
              </a>{" "}
              · See also our{" "}
              <Link to="/contact" className="underline hover:text-foreground">
                contact page
              </Link>
              .
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {done ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <Megaphone className="h-6 w-6" />
                </div>
                <h2 className="font-display text-2xl font-bold">Inquiry received</h2>
                <p className="text-sm text-muted-foreground">
                  Our advertising team will reply to{" "}
                  <span className="font-medium text-foreground">{form.email}</span> within 1–2
                  business days.
                </p>
                <Button variant="outline" onClick={() => setDone(false)}>
                  Submit another inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                <h2 className="font-display text-2xl font-bold">Tell us about your campaign</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Your name *" error={errors.contact_name}>
                    <Input
                      value={form.contact_name}
                      maxLength={100}
                      onChange={(e) => update("contact_name", e.target.value)}
                    />
                  </Field>
                  <Field label="Company" error={errors.company}>
                    <Input
                      value={form.company}
                      maxLength={120}
                      onChange={(e) => update("company", e.target.value)}
                    />
                  </Field>
                  <Field label="Email *" error={errors.email}>
                    <Input
                      type="email"
                      value={form.email}
                      maxLength={255}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone" error={errors.phone}>
                    <Input
                      value={form.phone}
                      maxLength={30}
                      placeholder="+63 917 555 0100"
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Placement" error={errors.placement}>
                  <Select
                    value={form.placement}
                    onValueChange={(v) => update("placement", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLACEMENTS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Monthly budget (₱)" error={errors.budget_range}>
                    <Input
                      placeholder="e.g. 20,000–50,000"
                      value={form.budget_range}
                      maxLength={60}
                      onChange={(e) => update("budget_range", e.target.value)}
                    />
                  </Field>
                  <Field label="Ideal start date" error={errors.start_date}>
                    <Input
                      type="date"
                      min={todayIso()}
                      value={form.start_date}
                      onChange={(e) => update("start_date", e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="What are you trying to achieve? *" error={errors.message}>
                  <Textarea
                    rows={4}
                    value={form.message}
                    maxLength={2000}
                    onChange={(e) => update("message", e.target.value)}
                    placeholder="Audience, goals, creatives you have ready, etc."
                  />
                  <p className="text-[11px] text-muted-foreground">{form.message.length}/2000</p>
                </Field>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Sending…" : "Request a proposal"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  We'll only use your contact details to reply about advertising. See our{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-sm font-semibold text-foreground">{title}</span></div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
