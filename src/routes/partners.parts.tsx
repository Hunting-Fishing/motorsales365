import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Handshake, CheckCircle2, Globe2, Boxes, Zap, ShieldCheck, FileText } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { submitPartnerApplication } from "@/lib/partner-applications.functions";

const TITLE = "Parts Partner Program — Sell on 365 MotorSales Philippines";
const DESCRIPTION =
  "Wholesalers, retailers, salvage yards, and online parts shops: list inventory or plug your catalog into 365MotorSales via affiliate, API, dropship, or wholesale partnership.";
const URL = "https://www.365motorsales.com/partners/parts";

export const Route = createFileRoute("/partners/parts")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: PartnersPartsPage,
});

const PARTNERSHIPS = [
  {
    key: "affiliate",
    icon: Globe2,
    title: "Affiliate placement",
    blurb:
      "Get a 'Shop on [Your Store]' button on relevant vehicle and parts listings. We send tagged traffic, you pay commission on sale.",
  },
  {
    key: "api",
    icon: Zap,
    title: "Catalog API",
    blurb:
      "Push your inventory and pricing to us via API. Buyers see real stock, real prices, and check out from your store.",
  },
  {
    key: "wholesale",
    icon: Boxes,
    title: "Wholesale supply",
    blurb:
      "Be one of our wholesale sources for the 365 outlets D2C parts program (PartSouq-style OEM by VIN).",
  },
  {
    key: "dropship",
    icon: ShieldCheck,
    title: "Dropship",
    blurb:
      "We sell, you ship. We handle the buyer, the listing, the support; you fulfill from your warehouse.",
  },
];

function PartnersPartsPage() {
  const submit = useServerFn(submitPartnerApplication);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    country: "PH",
    business_kind: "Retailer",
    partnership_type: "affiliate" as "affiliate" | "api" | "wholesale" | "dropship" | "sponsored" | "other",
    monthly_volume: "",
    brands_carried: "",
    notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.email.trim()) {
      toast.error("Company, contact, and email are required");
      return;
    }
    setSubmitting(true);
    try {
      await submit({ data: form });
      setDone(true);
      toast.success("Application received — we'll be in touch shortly.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        {/* Hero */}
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
          <div className="flex items-start gap-3">
            <Handshake className="h-7 w-7 shrink-0 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                Sell your parts on 365 MotorSales
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                We're building the Philippines' parts marketplace — vehicle listings, OEM
                catalog by VIN, parts-wanted alerts, and salvage-yard directory. Partner
                with us via affiliate, API, wholesale, or dropship.
              </p>
            </div>
          </div>
        </div>

        {/* Partnership types */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {PARTNERSHIPS.map((p) => (
            <div key={p.key} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 flex items-center gap-2">
                <p.icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{p.title}</h2>
              </div>
              <p className="text-xs text-muted-foreground">{p.blurb}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        {done ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
            <h2 className="text-lg font-semibold">Application received</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thanks for your interest. Our team reviews applications within 2–3 business days
              and will contact you at <span className="font-medium">{form.email}</span>.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <h2 className="text-base font-semibold">Apply for a partnership</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company name *">
                <input
                  required
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className={input}
                />
              </Field>
              <Field label="Contact name *">
                <input
                  required
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className={input}
                />
              </Field>
              <Field label="Email *">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={input}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={input}
                />
              </Field>
              <Field label="Website">
                <input
                  placeholder="https://"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className={input}
                />
              </Field>
              <Field label="Country">
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className={input}
                >
                  {["PH", "JP", "US", "SG", "MY", "TH", "ID", "VN", "AU", "CN", "Other"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Business type">
                <select
                  value={form.business_kind}
                  onChange={(e) => setForm({ ...form, business_kind: e.target.value })}
                  className={input}
                >
                  {[
                    "Retailer",
                    "Wholesaler / Distributor",
                    "Salvage yard / Parter-out",
                    "OEM dealer",
                    "Manufacturer",
                    "Online marketplace",
                    "Other",
                  ].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Partnership interest">
                <select
                  value={form.partnership_type}
                  onChange={(e) => setForm({ ...form, partnership_type: e.target.value as any })}
                  className={input}
                >
                  <option value="affiliate">Affiliate placement</option>
                  <option value="api">Catalog API</option>
                  <option value="wholesale">Wholesale supply</option>
                  <option value="dropship">Dropship</option>
                  <option value="sponsored">Sponsored placement / ads</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Monthly parts volume (approx.)">
                <input
                  placeholder="e.g. 500 SKUs / ₱1M GMV"
                  value={form.monthly_volume}
                  onChange={(e) => setForm({ ...form, monthly_volume: e.target.value })}
                  className={input}
                />
              </Field>
              <Field label="Brands carried">
                <input
                  placeholder="Toyota, Honda, Nissan…"
                  value={form.brands_carried}
                  onChange={(e) => setForm({ ...form, brands_carried: e.target.value })}
                  className={input}
                />
              </Field>
            </div>

            <Field label="Notes (catalog feed format, regions served, anything else)">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={input}
              />
            </Field>

            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-muted-foreground">
                By applying, you agree to be contacted about your application.
              </p>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}

const input =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
