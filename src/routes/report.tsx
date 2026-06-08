import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AlertTriangle, Shield, Upload, X, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a scam or suspicious listing — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Report scams, fraudulent sellers, stolen vehicles, or suspicious businesses on 365 MotorSales. Attach screenshots or documents as evidence — our trust & safety team reviews every report.",
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
  "Fake / cloned OR-CR",
  "Off-platform payment pressure",
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
  const [targetType, setTargetType] =
    useState<(typeof TARGET_TYPES)[number]["value"]>("listing");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [targetUrl, setTargetUrl] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

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
      reporter_name: name,
      reporter_email: email,
      reporter_phone: phone,
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
        reporter_name: name || null,
        reporter_email: email || user?.email || null,
        reporter_phone: phone || null,
        // listing_id stays null unless we can resolve from URL — moderators handle from URL field
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="target_type">What are you reporting?</Label>
                      <Select
                        value={targetType}
                        onValueChange={(v) => setTargetType(v as any)}
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

                  <div className="rounded-md border border-border bg-secondary/30 p-4">
                    <p className="mb-3 text-sm font-medium">
                      Your contact details{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        — optional, but lets us follow up
                      </span>
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="name" className="text-xs">
                          Name
                        </Label>
                        <Input
                          id="name"
                          className="mt-1"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={120}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-xs">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          className="mt-1"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={user?.email ?? ""}
                          maxLength={255}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone" className="text-xs">
                          Phone / Viber
                        </Label>
                        <Input
                          id="phone"
                          className="mt-1"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          maxLength={40}
                        />
                      </div>
                    </div>
                  </div>

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
