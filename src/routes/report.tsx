import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AlertTriangle, Shield, Upload, X, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ReportTargetPreview } from "@/components/report-target-preview";

const searchSchema = z.object({
  target_type: z.enum(["listing", "business", "seller", "other"]).optional(),
  category: z.string().optional(),
  listing_id: z.string().uuid().optional(),
  business_id: z.string().uuid().optional(),
  seller_id: z.string().uuid().optional(),
  target_url: z.string().optional(),
  details: z.string().optional(),
});

export const Route = createFileRoute("/report")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Report a scam or suspicious listing — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Report scams, fraudulent sellers, stolen vehicles, fake documents, off-platform payments, duplicate listings, and price bait on 365 MotorSales. Our trust & safety team reviews every report.",
      },
    ],
  }),
  component: ReportPage,
});

const TARGET_TYPES = [
  { value: "listing", label: "A vehicle listing" },
  { value: "business", label: "A business / shop" },
  { value: "seller", label: "A seller or user account" },
  { value: "other", label: "Something else" },
] as const;

const CATEGORIES = [
  "Scam / fraud attempt",
  "Stolen vehicle",
  "Fake / forged documents",
  "Off-platform payment pressure",
  "Duplicate listing",
  "Price bait / hidden fees",
  "Misleading photos or description",
  "Wrong category / spam",
  "Offensive or illegal content",
  "Impersonation",
  "Other",
];

const MAX_FILES = 6;
const MAX_FILE_MB = 10;

const schema = z.object({
  target_type: z.enum(["listing", "business", "seller", "other"]),
  category: z.string().min(1, "Choose a reason"),
  target_url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),
  details: z
    .string()
    .trim()
    .min(20, "Please give us at least 20 characters of detail")
    .max(4000),
  reporter_name: z.string().trim().max(120).optional().or(z.literal("")),
  reporter_email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255)
    .optional()
    .or(z.literal("")),
  reporter_phone: z.string().trim().max(40).optional().or(z.literal("")),
});

function ReportPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const initialCategory =
    search.category && CATEGORIES.includes(search.category) ? search.category : CATEGORIES[0];
  // Determine initial target_type from any id passed in
  const initialTargetType =
    search.target_type ??
    (search.listing_id
      ? "listing"
      : search.business_id
        ? "business"
        : search.seller_id
          ? "seller"
          : "listing");
  const [targetType, setTargetType] = useState<(typeof TARGET_TYPES)[number]["value"]>(
    initialTargetType,
  );
  const [category, setCategory] = useState(initialCategory);
  const [targetUrl, setTargetUrl] = useState(search.target_url ?? "");
  const [details, setDetails] = useState(search.details ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | undefined>(search.listing_id);
  const [businessId, setBusinessId] = useState<string | undefined>(search.business_id);
  const [sellerId, setSellerId] = useState<string | undefined>(search.seller_id);
  const [reporterName, setReporterName] = useState<string | null>(null);
  const [reporterPhone, setReporterPhone] = useState<string | null>(null);
  const hasKnownTarget = !!(listingId || businessId || sellerId);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name, business_name, phone_e164, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const p = data as any;
      setReporterName(
        p.full_name ||
          [p.first_name, p.last_name].filter(Boolean).join(" ") ||
          p.business_name ||
          null,
      );
      setReporterPhone(p.phone_e164 || p.phone || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const clearTarget = () => {
    setListingId(undefined);
    setBusinessId(undefined);
    setSellerId(undefined);
    setTargetType("other");
    setTargetUrl("");
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (next.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name} is over ${MAX_FILE_MB}MB.`);
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const removeFile = (i: number) => setFiles(files.filter((_, idx) => idx !== i));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      target_type: targetType,
      category,
      target_url: targetUrl,
      details,
      reporter_name: reporterName ?? "",
      reporter_email: user?.email ?? "",
      reporter_phone: reporterPhone ?? "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please review the form");
      return;
    }
    setSubmitting(true);
    try {
      // Upload evidence first
      const evidence_urls: string[] = [];
      const folder = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
      for (const f of files) {
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
        const path = `${folder}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("report-evidence")
          .upload(path, f, { upsert: false, contentType: f.type || undefined });
        if (upErr) throw upErr;
        evidence_urls.push(path);
      }

      const { error } = await supabase.from("reports").insert({
        target_type: targetType,
        category,
        reason: category,
        details,
        target_url: targetUrl || null,
        evidence_urls,
        reporter_id: user?.id ?? null,
        reporter_name: reporterName || null,
        reporter_email: user?.email ?? null,
        reporter_phone: reporterPhone || null,
        listing_id: listingId ?? null,
        business_id: businessId ?? null,
      } as any);
      if (error) throw error;

      setDone(
        "Thanks — your report has been received. Our trust & safety team reviews every submission and may follow up by email.",
      );
      setDetails("");
      setTargetUrl("");
      setFiles([]);
    } catch (err: any) {
      console.error("[report] failed", err);
      toast.error(err?.message ?? "Could not submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
            <Shield className="h-3.5 w-3.5" />
            Trust & Safety
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Report a scam or suspicious listing
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Help keep 365 MotorSales Philippines safe. Use this form to report fraudulent
            sellers, suspected stolen vehicles, fake OR/CR documents, businesses misrepresenting
            themselves, or anyone pressuring you to pay off-platform. We review every report
            within 48 hours.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle>File a report</CardTitle>
            </CardHeader>
            <CardContent>
              {done ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Report received
                  </div>
                  <p className="text-muted-foreground">{done}</p>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDone(null)}>
                      File another report
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/">Back to home</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <ReportTargetPreview
                    listingId={listingId}
                    businessId={businessId}
                    sellerId={sellerId}
                    onResolved={(_p, url) => {
                      if (url) setTargetUrl(url);
                    }}
                    onClear={clearTarget}
                    hideClear
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="target_type">What are you reporting?</Label>
                        {hasKnownTarget && (
                          <button
                            type="button"
                            onClick={clearTarget}
                            className="text-[11px] text-muted-foreground underline hover:text-foreground"
                          >
                            Not the right item?
                          </button>
                        )}
                      </div>
                      <Select
                        value={targetType}
                        onValueChange={(v) => setTargetType(v as any)}
                        disabled={hasKnownTarget}
                      >
                        <SelectTrigger id="target_type" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Reason</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!hasKnownTarget && (
                    <div>
                      <Label htmlFor="target_url">
                        Link to the listing, business, or profile{" "}
                        <span className="text-muted-foreground">(if any)</span>
                      </Label>
                      <Input
                        id="target_url"
                        className="mt-1"
                        placeholder="https://365motorsales.com/listing/..."
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        maxLength={500}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="details">What happened?</Label>
                    <Textarea
                      id="details"
                      className="mt-1 min-h-32"
                      placeholder="Describe what's wrong: messages received, payment requests, suspicious documents, etc. Include dates and any usernames or phone numbers you saw."
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      maxLength={4000}
                      required
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {details.length}/4000 — minimum 20 characters
                    </p>
                  </div>

                  <div>
                    <Label>Evidence (optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Up to {MAX_FILES} files, max {MAX_FILE_MB}MB each. Screenshots, photos of
                      documents (OR/CR, receipts), chat exports, etc.
                    </p>
                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/30 px-4 py-6 text-sm text-muted-foreground hover:bg-secondary/50">
                      <Upload className="h-4 w-4" />
                      Click to attach files
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          handleFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {files.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {files.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between rounded border border-border bg-card px-3 py-2 text-sm"
                          >
                            <span className="truncate">
                              {f.name}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({Math.round(f.size / 1024)} KB)
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              className="ml-2 text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${f.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {user ? (
                    <p className="text-xs text-muted-foreground">
                      We'll follow up at <span className="font-medium text-foreground">{user.email}</span> if needed.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      <Link to="/auth" className="underline">Sign in</Link> so our team can follow up with you.
                    </p>
                  )}



                  <FormFeedbackLink formId="report-listing-page" className="mb-2" />
                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? "Submitting…" : "Submit report"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    By submitting, you confirm the information is accurate to the best of your
                    knowledge. False reports may result in account action. See our{" "}
                    <Link to="/terms" className="underline">
                      Terms
                    </Link>
                    .
                  </p>
                </form>
              )}
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Buyer safety checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Never send full payment before inspecting in person.</p>
                <p>• Verify OR/CR matches the seller's government ID.</p>
                <p>• Meet in a public, well-lit area — ideally a police or LTO office.</p>
                <p>• Confirm the chassis and engine numbers match the CR.</p>
                <p>• Don't pay deposits via gift cards, crypto, or untraceable e-wallets.</p>
                <p>• Be cautious of prices well below market value.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Urgent or in danger?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  For active crimes, contact the{" "}
                  <strong>PNP Highway Patrol Group (HPG)</strong> or dial{" "}
                  <strong>911</strong>. For stolen vehicles, file a report with HPG and email us
                  the case reference at{" "}
                  <a href="mailto:safety@365motorsales.com" className="underline">
                    safety@365motorsales.com
                  </a>
                  .
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
