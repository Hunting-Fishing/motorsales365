import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Megaphone, Target, BarChart3, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PhoneInput } from "@/components/phone-input";
import { buildE164 } from "@/data/country-codes";
import { siteOrigin } from "@/lib/site-config";
import {
  SECTIONS,
  FORMATS,
  TIER_TONE,
  type SectionValue,
  type FormatValue,
  sectionLabel,
  formatLabel,
} from "@/components/advertise/placements";
import { PlacementPreview } from "@/components/advertise/placement-preview";

export const Route = createFileRoute("/advertise")({
  validateSearch: (s: Record<string, unknown>) => ({
    section: typeof s.section === "string" ? s.section : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Advertise & Sponsor — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Sponsor placements across the 365 MotorSales marketplace, Academy, rides feed, shop, and newsletter. Pick your location and request a proposal.",
      },
    ],
  }),
  component: AdvertisePage,
});

const todayIso = () => new Date().toISOString().slice(0, 10);

const inquirySchema = z.object({
  contact_name: z.string().trim().min(1, "Required").max(100),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Invalid email").max(255),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d][\d\s\-().]*$/u, "Digits, spaces, + - ( ) only")
    .optional()
    .or(z.literal("")),
  sections: z.array(z.string()).min(1, "Pick at least one placement"),
  formats: z.array(z.string()),
  target_url: z
    .string()
    .trim()
    .max(500)
    .url("Must be a valid URL (https://...)")
    .optional()
    .or(z.literal("")),
  budget_range: z.string().trim().max(60).optional().or(z.literal("")),
  start_date: z
    .string()
    .trim()
    .refine((v) => !v || v >= todayIso(), "Start date must be today or later")
    .optional()
    .or(z.literal("")),
  end_date: z.string().trim().optional().or(z.literal("")),
  duration_days: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
  creative_ready: z.boolean(),
  audience_notes: z.string().trim().max(1000).optional().or(z.literal("")),
  message: z.string().trim().min(10, "At least 10 characters").max(2000),
});

function AdvertisePage() {
  const { section: urlSection } = Route.useSearch();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");
  const [form, setForm] = useState({
    contact_name: "",
    company: "",
    email: "",
    phone: "",
    sections: [] as SectionValue[],
    formats: [] as FormatValue[],
    target_url: "",
    budget_range: "",
    start_date: "",
    end_date: "",
    duration_days: "" as string,
    creative_ready: false,
    audience_notes: "",
    message: "",
  });

  // Prefill section from ?section=... (e.g. from the Learn rail)
  useEffect(() => {
    if (urlSection && SECTIONS.some((s) => s.value === urlSection)) {
      setForm((f) =>
        f.sections.includes(urlSection as SectionValue)
          ? f
          : { ...f, sections: [...f.sections, urlSection as SectionValue] },
      );
      requestAnimationFrame(() => {
        document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSection]);

  const allowedFormats = useMemo(() => {
    if (form.sections.length === 0) return new Set<string>(FORMATS.map((f) => f.value));
    const allowed = new Set<string>();
    form.sections.forEach((s) => {
      const meta = SECTIONS.find((x) => x.value === s);
      meta?.formats.forEach((f) => allowed.add(f));
    });
    return allowed;
  }, [form.sections]);

  const toggleSection = (v: SectionValue) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.includes(v) ? f.sections.filter((x) => x !== v) : [...f.sections, v],
      formats: f.formats.filter((fmt) => {
        // recompute allowed formats with new section set
        const next = f.sections.includes(v) ? f.sections.filter((x) => x !== v) : [...f.sections, v];
        if (next.length === 0) return true;
        const allow = new Set<string>();
        next.forEach((s) => SECTIONS.find((x) => x.value === s)?.formats.forEach((ff) => allow.add(ff)));
        return allow.has(fmt);
      }),
    }));

  const toggleFormat = (v: FormatValue) =>
    setForm((f) => ({
      ...f,
      formats: f.formats.includes(v) ? f.formats.filter((x) => x !== v) : [...f.formats, v],
    }));

  const selectFromCatalog = (v: SectionValue) => {
    setForm((f) =>
      f.sections.includes(v) ? f : { ...f, sections: [...f.sections, v] },
    );
    setStep(1);
    requestAnimationFrame(() => {
      document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const submit = async () => {
    const parsed = inquirySchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    const v = parsed.data;
    const primary = SECTIONS.find((s) => s.value === v.sections[0])?.placement ?? "other";
    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("ad_inquiries").insert({
      contact_name: v.contact_name,
      company: v.company || null,
      email: v.email,
      phone: v.phone || null,
      placement: primary as any,
      sections: v.sections,
      formats: v.formats,
      target_url: v.target_url || null,
      budget_range: v.budget_range || null,
      start_date: v.start_date || null,
      end_date: v.end_date || null,
      duration_days: v.duration_days ?? null,
      creative_ready: v.creative_ready,
      audience_notes: v.audience_notes || null,
      message: v.message,
      submitter_user_id: userData.user?.id ?? null,
      source_url:
        typeof window !== "undefined" ? `${siteOrigin()}${window.location.pathname}` : null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success("Inquiry received — our advertising team will reply shortly.");
  };

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container mx-auto max-w-6xl px-4 py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <Megaphone className="h-3.5 w-3.5" /> Advertise & sponsor
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-5xl">
                Put your brand in front of Filipino vehicle buyers, sellers, and learners.
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Sponsor placements across the marketplace, Academy (/learn), rides feed, parts shop,
                business directory, and newsletter. Pick exactly where you want to show up.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button asChild>
                  <a href="#catalog">
                    Browse placements <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="#request">Request a proposal</a>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/dashboard/sponsorships">My sponsorships</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Feature icon={<Target className="h-5 w-5" />} title="Targeted by section" body="Marketplace, Learn, Rides, Shop, Newsletter, more." />
              <Feature icon={<BarChart3 className="h-5 w-5" />} title="Transparent metrics" body="Impressions & clicks on every campaign." />
              <Feature icon={<Megaphone className="h-5 w-5" />} title="Multiple formats" body="Banners, sidebar tiles, sponsored cards, slots." />
              <Feature icon={<Mail className="h-5 w-5" />} title="Personal review" body="Every submission reviewed by our team." />
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="border-b border-border">
        <div className="container mx-auto max-w-6xl px-4 py-14">
          <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-2xl font-bold">Placement catalog</h2>
              <p className="text-sm text-muted-foreground">
                Pick one or more locations. Click <span className="font-semibold text-foreground">Select</span> to add it to your request.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={TIER_TONE.Starter}>Starter</Badge>
              <Badge variant="outline" className={TIER_TONE.Growth}>Growth</Badge>
              <Badge variant="outline" className={TIER_TONE.Premium}>Premium</Badge>
              <Badge variant="outline" className={TIER_TONE.Custom}>Custom</Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s) => {
              const selected = form.sections.includes(s.value);
              return (
                <div
                  key={s.value}
                  className={`rounded-xl border p-4 transition ${
                    selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <PlacementPreview section={s.value} />
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{s.label}</h3>
                    <Badge variant="outline" className={TIER_TONE[s.tier]}>{s.tier}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{s.blurb}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Audience: </span>{s.audience}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.formats.map((f) => (
                      <Badge key={f} variant="secondary" className="text-[10px]">
                        {formatLabel(f)}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    className="mt-3 w-full"
                    onClick={() => selectFromCatalog(s.value)}
                  >
                    {selected ? (
                      <><CheckCircle2 className="mr-1 h-4 w-4" /> Selected</>
                    ) : (
                      "Select this placement"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Public rate card */}
      <section id="rate-card" className="border-b border-border bg-secondary/30">
        <div className="container mx-auto max-w-6xl px-4 py-14">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold">Public rate card</h2>
            <p className="text-sm text-muted-foreground">
              Indicative monthly rates in Philippine Peso. Final pricing depends on flight length,
              creative, targeting, and inventory availability — confirmed in your proposal.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Placement</th>
                  <th className="px-4 py-3 font-semibold">Indicative rate</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { p: "Homepage hero sponsor", r: "₱2,500 – ₱10,000 / mo", n: "Top of /, highest reach. Limited slots." },
                  { p: "Category banner (Cars, Motorcycles, etc.)", r: "₱1,000 – ₱5,000 / mo", n: "Top of one chosen category page." },
                  { p: "Listing detail sidebar tile", r: "₱750 – ₱3,000 / mo", n: "Rendered next to every individual listing." },
                  { p: "Business directory featured", r: "₱500 – ₱2,000 / mo", n: "Pinned on /businesses results." },
                  { p: "Learn / Academy sponsor card", r: "₱500 – ₱2,500 / mo", n: "Sidebar of /learn course pages." },
                  { p: "Newsletter sponsor slot", r: "₱500 – ₱2,000 / send", n: "Per newsletter send, not per month." },
                  { p: "Local province sponsor", r: "₱500 – ₱3,000 / mo", n: "Geo-targeted to one PH province." },
                ].map((row) => (
                  <tr key={row.p}>
                    <td className="px-4 py-3 font-medium">{row.p}</td>
                    <td className="px-4 py-3 text-primary">{row.r}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <h3 className="font-display text-lg font-semibold">Bundles</h3>
            <p className="text-sm text-muted-foreground">
              Mix-and-match packages for sellers, dealers, and brands.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: "Local Shop",
                  price: "₱499 / mo",
                  desc: "1 category banner + 1 business directory feature in your province.",
                  tier: "Starter",
                },
                {
                  name: "Dealer Visibility",
                  price: "₱1,499 / mo",
                  desc: "Category banner + sidebar tile across all listings in your category.",
                  tier: "Growth",
                },
                {
                  name: "Province Domination",
                  price: "₱4,999 / mo",
                  desc: "Hero rotation + category banner + newsletter mention, all geo-targeted to one province.",
                  tier: "Premium",
                },
                {
                  name: "National Brand",
                  price: "Custom",
                  desc: "Multi-placement national campaign with dedicated account management.",
                  tier: "Custom",
                },
              ].map((b) => (
                <div key={b.name} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold">{b.name}</h4>
                    <Badge variant="outline" className={TIER_TONE[b.tier]}>{b.tier}</Badge>
                  </div>
                  <p className="mt-1 text-lg font-bold text-primary">{b.price}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Rates are indicative and may be adjusted by inventory, targeting, and creative
            requirements. All bookings are confirmed in a written proposal before invoicing.
          </p>
        </div>
      </section>


      {/* Request form */}
      <section id="request">
        <div className="container mx-auto max-w-4xl px-4 py-14">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {done ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center py-10">
                <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="font-display text-2xl font-bold">Inquiry received</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Our advertising team will reply to{" "}
                  <span className="font-medium text-foreground">{form.email}</span> within 1–2
                  business days. You can track status, see admin decisions, and edit rejected
                  inquiries from your dashboard.
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <Button asChild>
                    <Link to="/dashboard/sponsorships">View my sponsorships</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDone(false);
                      setStep(1);
                      setForm({
                        contact_name: "",
                        company: "",
                        email: "",
                        phone: "",
                        sections: [],
                        formats: [],
                        target_url: "",
                        budget_range: "",
                        start_date: "",
                        end_date: "",
                        duration_days: "",
                        creative_ready: false,
                        audience_notes: "",
                        message: "",
                      });
                    }}
                  >
                    Submit another
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold">Request a sponsorship</h2>
                  <Steps step={step} />
                </div>

                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <Label className="text-sm font-semibold">Placements *</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Pick one or more sections of the site you'd like to sponsor.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SECTIONS.map((s) => {
                          const checked = form.sections.includes(s.value);
                          return (
                            <label
                              key={s.value}
                              className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition ${
                                checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                              }`}
                            >
                              <Checkbox checked={checked} onCheckedChange={() => toggleSection(s.value)} />
                              <div>
                                <div className="text-sm font-medium leading-tight">{s.label}</div>
                                <div className="text-xs text-muted-foreground">{s.blurb}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Formats</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Optional — what creative formats do you want to run?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {FORMATS.map((f) => {
                          const enabled = allowedFormats.has(f.value);
                          const checked = form.formats.includes(f.value);
                          return (
                            <button
                              type="button"
                              key={f.value}
                              disabled={!enabled}
                              onClick={() => toggleFormat(f.value)}
                              className={`rounded-full border px-3 py-1 text-xs transition ${
                                !enabled
                                  ? "opacity-40 cursor-not-allowed"
                                  : checked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              {f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <NavRow
                      onNext={() => {
                        if (form.sections.length === 0) {
                          toast.error("Pick at least one placement");
                          return;
                        }
                        setStep(2);
                      }}
                    />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Landing URL">
                        <Input
                          type="url"
                          placeholder="https://yourbrand.com/promo"
                          value={form.target_url}
                          maxLength={500}
                          onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                        />
                      </Field>
                      <Field label="Monthly budget (₱)">
                        <Input
                          placeholder="e.g. 20,000–50,000"
                          value={form.budget_range}
                          maxLength={60}
                          onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
                        />
                      </Field>
                      <Field label="Start date">
                        <Input
                          type="date"
                          min={todayIso()}
                          value={form.start_date}
                          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                        />
                      </Field>
                      <Field label="End date">
                        <Input
                          type="date"
                          min={form.start_date || todayIso()}
                          value={form.end_date}
                          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                        />
                      </Field>
                      <Field label="Duration (days)">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={form.duration_days}
                          onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                        />
                      </Field>
                      <Field label="Creative ready?">
                        <label className="flex items-center gap-2 text-sm pt-2">
                          <Checkbox
                            checked={form.creative_ready}
                            onCheckedChange={(v) =>
                              setForm({ ...form, creative_ready: v === true })
                            }
                          />
                          Yes, I already have artwork/copy
                        </label>
                      </Field>
                    </div>
                    <Field label="Target audience notes">
                      <Textarea
                        rows={2}
                        maxLength={1000}
                        placeholder="Regions, vehicle types, buyer vs. seller, age bracket, etc."
                        value={form.audience_notes}
                        onChange={(e) => setForm({ ...form, audience_notes: e.target.value })}
                      />
                    </Field>
                    <Field label="What are you trying to achieve? *">
                      <Textarea
                        rows={4}
                        value={form.message}
                        maxLength={2000}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Goals, KPIs, anything our team should know."
                      />
                      <p className="text-[11px] text-muted-foreground">{form.message.length}/2000</p>
                    </Field>
                    <NavRow back={() => setStep(1)} onNext={() => setStep(3)} />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Your name *">
                        <Input
                          value={form.contact_name}
                          maxLength={100}
                          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                        />
                      </Field>
                      <Field label="Company">
                        <Input
                          value={form.company}
                          maxLength={120}
                          onChange={(e) => setForm({ ...form, company: e.target.value })}
                        />
                      </Field>
                      <Field label="Email *">
                        <Input
                          type="email"
                          value={form.email}
                          maxLength={255}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </Field>
                      <Field label="Phone">
                        <PhoneInput
                          iso={phoneIso}
                          national={phoneNational}
                          onChange={({ iso, national }) => {
                            setPhoneIso(iso);
                            setPhoneNational(national);
                            setForm({ ...form, phone: buildE164(iso, national) ?? "" });
                          }}
                        />
                      </Field>
                    </div>
                    <NavRow back={() => setStep(2)} onNext={() => setStep(4)} />
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Review</h3>
                    <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm space-y-2">
                      <Review label="Contact" value={`${form.contact_name}${form.company ? " · " + form.company : ""} · ${form.email}${form.phone ? " · " + form.phone : ""}`} />
                      <Review label="Placements" value={form.sections.map(sectionLabel).join(", ")} />
                      {form.formats.length > 0 && (
                        <Review label="Formats" value={form.formats.map(formatLabel).join(", ")} />
                      )}
                      {form.target_url && <Review label="Landing URL" value={form.target_url} />}
                      {form.budget_range && <Review label="Budget" value={form.budget_range} />}
                      {(form.start_date || form.end_date || form.duration_days) && (
                        <Review
                          label="Schedule"
                          value={[
                            form.start_date && `from ${form.start_date}`,
                            form.end_date && `to ${form.end_date}`,
                            form.duration_days && `${form.duration_days} days`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        />
                      )}
                      <Review label="Creative ready" value={form.creative_ready ? "Yes" : "No"} />
                      {form.audience_notes && <Review label="Audience" value={form.audience_notes} />}
                      <Review label="Goals" value={form.message} />
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <Button variant="ghost" onClick={() => setStep(3)} disabled={submitting}>
                        Back
                      </Button>
                      <Button onClick={submit} disabled={submitting}>
                        {submitting ? "Sending…" : "Submit for review"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All submissions are reviewed by our advertising team. You'll receive an email
                      with the decision and can edit/resubmit if rejected — see{" "}
                      <Link to="/privacy" className="underline">Privacy Policy</Link>.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Placements", "Campaign", "Contact", "Review"];
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <li key={l} className="flex items-center gap-1">
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </span>
            <span className={active ? "font-semibold" : "text-muted-foreground"}>{l}</span>
            {i < labels.length - 1 && <span className="px-1 text-muted-foreground">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

function NavRow({ back, onNext }: { back?: () => void; onNext: () => void }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 pt-2">
      {back ? (
        <Button variant="ghost" onClick={back}>Back</Button>
      ) : (
        <span />
      )}
      <Button onClick={onNext}>Continue</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
