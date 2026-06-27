import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  FileText,
  X,
  Loader2,
  Building2,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { submitPartnerApplication } from "@/lib/partner-applications.functions";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Auto Parts Supplier Onboarding — 365 MotorSales";
const DESCRIPTION =
  "Apply to become a verified auto parts supplier on 365 MotorSales Philippines. Submit your business details and required documents for review.";
const URL = "https://www.365motorsales.com/partners/parts/onboarding";

export const Route = createFileRoute("/partners/parts/onboarding")({
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
  component: OnboardingPage,
});

type DocKind =
  | "business_permit"
  | "tax_cert"
  | "bir_registration"
  | "dti_sec"
  | "valid_id"
  | "price_list"
  | "catalog_sample"
  | "other";

const REQUIRED_DOCS: { kind: DocKind; label: string; required: boolean; hint: string }[] = [
  { kind: "business_permit", label: "Mayor's / Business Permit", required: true, hint: "Current year, all pages" },
  { kind: "bir_registration", label: "BIR Certificate of Registration (2303)", required: true, hint: "PDF or photo" },
  { kind: "dti_sec", label: "DTI or SEC Registration", required: true, hint: "Sole prop = DTI · Corp = SEC" },
  { kind: "valid_id", label: "Valid Government ID (signatory)", required: true, hint: "Owner / authorized rep" },
  { kind: "tax_cert", label: "Latest BIR 2316 / VAT cert (optional)", required: false, hint: "If applicable" },
  { kind: "price_list", label: "Wholesale price list (optional)", required: false, hint: "PDF / XLSX / CSV" },
  { kind: "catalog_sample", label: "Catalog sample (optional)", required: false, hint: "PDF or image set" },
];

type UploadedDoc = { name: string; path: string; size: number; type: string; kind: DocKind };

function OnboardingPage() {
  const submit = useServerFn(submitPartnerApplication);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [uploadingKind, setUploadingKind] = useState<DocKind | null>(null);

  const [form, setForm] = useState({
    company_name: "",
    legal_business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    country: "PH",
    business_kind: "Retailer",
    partnership_type: "wholesale" as const,
    tax_id: "",
    business_address: "",
    city: "",
    province_state: "",
    postal_code: "",
    years_in_business: "",
    warehouse_locations: "",
    ships_nationwide: false,
    payment_terms: "",
    monthly_volume: "",
    brands_carried: "",
    catalog_feed_url: "",
    catalog_feed_format: "",
    notes: "",
    agreed_terms: false,
  });

  async function handleUpload(kind: DocKind, file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large (max 15MB)");
      return;
    }
    setUploadingKind(kind);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const path = `incoming/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${kind}-${safeName}`;
      const { error } = await supabase.storage
        .from("supplier-docs")
        .upload(path, file, { contentType: file.type || `application/${ext}`, upsert: false });
      if (error) throw error;
      setDocs((d) => [
        ...d.filter((x) => x.kind !== kind || REQUIRED_DOCS.find((r) => r.kind === kind)?.required === false),
        { name: file.name, path, size: file.size, type: file.type || "", kind },
      ]);
      toast.success(`${file.name} uploaded`);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploadingKind(null);
    }
  }

  function removeDoc(path: string) {
    setDocs((d) => d.filter((x) => x.path !== path));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.agreed_terms) return toast.error("Please agree to the supplier terms");
    const missing = REQUIRED_DOCS.filter(
      (r) => r.required && !docs.some((d) => d.kind === r.kind),
    );
    if (missing.length) {
      return toast.error(`Missing required documents: ${missing.map((m) => m.label).join(", ")}`);
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          ...form,
          years_in_business: form.years_in_business ? parseInt(form.years_in_business, 10) : null,
          documents: docs,
        },
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Application submitted");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-7 w-7 shrink-0 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                Auto Parts Supplier Onboarding
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                For verified wholesale, retail, salvage, and OEM suppliers. Complete this form
                and upload the required business documents — our team will review within 3–5
                business days.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Just exploring partnership options?{" "}
                <Link to="/partners/parts" className="text-primary hover:underline">
                  Use the short interest form instead →
                </Link>
              </p>
            </div>
          </div>
        </div>

        {done ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
            <h2 className="text-lg font-semibold">Application & documents received</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll verify your documents and contact{" "}
              <span className="font-medium">{form.email}</span> within 3–5 business days.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Company */}
            <Section icon={Building2} title="Business details">
              <Grid>
                <Field label="Trading / brand name *">
                  <input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className={input} />
                </Field>
                <Field label="Legal registered name *">
                  <input required value={form.legal_business_name} onChange={(e) => setForm({ ...form, legal_business_name: e.target.value })} className={input} />
                </Field>
                <Field label="TIN / Tax ID *">
                  <input required value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className={input} />
                </Field>
                <Field label="Years in business">
                  <input type="number" min={0} value={form.years_in_business} onChange={(e) => setForm({ ...form, years_in_business: e.target.value })} className={input} />
                </Field>
                <Field label="Business type">
                  <select value={form.business_kind} onChange={(e) => setForm({ ...form, business_kind: e.target.value })} className={input}>
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
                <Field label="Website">
                  <input placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={input} />
                </Field>
              </Grid>
            </Section>

            {/* Address */}
            <Section icon={Building2} title="Address & coverage">
              <Grid>
                <Field label="Street address *">
                  <input required value={form.business_address} onChange={(e) => setForm({ ...form, business_address: e.target.value })} className={input} />
                </Field>
                <Field label="City / Municipality *">
                  <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} />
                </Field>
                <Field label="Province / State *">
                  <input required value={form.province_state} onChange={(e) => setForm({ ...form, province_state: e.target.value })} className={input} />
                </Field>
                <Field label="Postal code">
                  <input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className={input} />
                </Field>
                <Field label="Country">
                  <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={input}>
                    {["PH", "JP", "US", "SG", "MY", "TH", "ID", "VN", "AU", "CN", "Other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Warehouse / branch locations">
                  <input placeholder="Banawe, Cebu, Davao" value={form.warehouse_locations} onChange={(e) => setForm({ ...form, warehouse_locations: e.target.value })} className={input} />
                </Field>
              </Grid>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.ships_nationwide} onChange={(e) => setForm({ ...form, ships_nationwide: e.target.checked })} />
                We ship nationwide (LBC, J&T, courier)
              </label>
            </Section>

            {/* Contact */}
            <Section icon={Building2} title="Contact & partnership">
              <Grid>
                <Field label="Contact name *">
                  <input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={input} />
                </Field>
                <Field label="Email *">
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} />
                </Field>
                <Field label="Phone *">
                  <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} />
                </Field>
                <Field label="Partnership interest *">
                  <select value={form.partnership_type} onChange={(e) => setForm({ ...form, partnership_type: e.target.value as any })} className={input}>
                    <option value="wholesale">Wholesale supply</option>
                    <option value="dropship">Dropship</option>
                    <option value="api">Catalog API</option>
                    <option value="affiliate">Affiliate placement</option>
                    <option value="sponsored">Sponsored placement / ads</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Payment terms offered">
                  <input placeholder="COD · 7 days · 30 days" value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className={input} />
                </Field>
                <Field label="Monthly parts volume">
                  <input placeholder="₱1M GMV / 500 SKUs" value={form.monthly_volume} onChange={(e) => setForm({ ...form, monthly_volume: e.target.value })} className={input} />
                </Field>
                <Field label="Brands carried">
                  <input placeholder="Toyota, Honda, Nissan…" value={form.brands_carried} onChange={(e) => setForm({ ...form, brands_carried: e.target.value })} className={input} />
                </Field>
                <Field label="Catalog feed URL (if any)">
                  <input placeholder="https://…" value={form.catalog_feed_url} onChange={(e) => setForm({ ...form, catalog_feed_url: e.target.value })} className={input} />
                </Field>
                <Field label="Catalog format">
                  <select value={form.catalog_feed_format} onChange={(e) => setForm({ ...form, catalog_feed_format: e.target.value })} className={input}>
                    <option value="">—</option>
                    {["CSV", "XLSX", "JSON", "XML", "API", "Other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </Grid>
              <Field label="Notes for our team">
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={input} />
              </Field>
            </Section>

            {/* Documents */}
            <Section icon={FileText} title="Required documents">
              <p className="mb-3 text-xs text-muted-foreground">
                Accepted: PDF, JPG, PNG, XLSX, CSV · Max 15MB each. Documents are stored
                privately and only visible to our review team.
              </p>
              <div className="space-y-2">
                {REQUIRED_DOCS.map((doc) => {
                  const uploaded = docs.filter((d) => d.kind === doc.kind);
                  const busy = uploadingKind === doc.kind;
                  return (
                    <div key={doc.kind} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {doc.label}{" "}
                            {doc.required && <span className="text-destructive">*</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{doc.hint}</p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          {busy ? "Uploading…" : "Choose file"}
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
                            disabled={busy}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(doc.kind, f);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                      {uploaded.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {uploaded.map((u) => (
                            <li key={u.path} className="flex items-center gap-2 rounded bg-emerald-500/5 px-2 py-1 text-xs">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span className="truncate">{u.name}</span>
                              <span className="text-muted-foreground">({Math.round(u.size / 1024)} KB)</span>
                              <button
                                type="button"
                                onClick={() => removeDoc(u.path)}
                                className="ml-auto text-muted-foreground hover:text-destructive"
                                aria-label="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Terms + submit */}
            <div className="rounded-xl border border-border bg-card p-5">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.agreed_terms}
                  onChange={(e) => setForm({ ...form, agreed_terms: e.target.checked })}
                />
                <span>
                  I certify that the information and documents submitted are accurate, and I
                  agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    365 MotorSales partner terms
                  </Link>
                  . I understand approval is at 365 MotorSales' discretion.
                </span>
              </label>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit application"}
                </Button>
              </div>
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
