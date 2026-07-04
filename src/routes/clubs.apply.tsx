import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, FileText, Info, ShieldCheck, Upload, X } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createPendingClub, attachClubDocuments } from "@/lib/clubs.functions";
import { uploadWithRetry } from "@/lib/storage-upload";

const CLUB_TYPES = [
  "motorcycle_riding",
  "car_club",
  "off_road",
  "truck_club",
  "brand_owners",
  "general_motoring",
  "other",
] as const;

export const Route = createFileRoute("/clubs/apply")({
  head: () => ({
    meta: [
      { title: "Apply for a Club — 365 MotorSales" },
      {
        name: "description",
        content:
          "Apply to list your accredited motoring club. Requires formal documentation (LTO accreditation, SEC, DTI, or equivalent).",
      },
      { property: "og:title", content: "Apply for a Club — 365 MotorSales" },
      { property: "og:description", content: "Apply to list your accredited club." },
    ],
    links: [{ rel: "canonical", href: "https://www.365motorsales.com/clubs/apply" }],
  }),
  validateSearch: (s: Record<string, unknown>) => {
    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.trim().length > 0 ? v.slice(0, max) : undefined;
    // Return the raw `type` string (even if not in the enum) so TanStack Router
    // doesn't 307-strip it from the URL. Validity is derived in the component.
    const rawType = str(s.type, 60);
    return {
      type: rawType,
      name: str(s.name, 120),
      description: str(s.description, 2000),
      region: str(s.region, 120),
      city: str(s.city, 120),
    };
  },
  component: ApplyClubPage,
});

const DOC_KINDS = [
  { value: "lto_accreditation", label: "LTO Accreditation" },
  { value: "sec_incorporation", label: "SEC Certificate of Incorporation" },
  { value: "dti_business_permit", label: "DTI / Business Permit" },
  { value: "other", label: "Other formal document" },
] as const;

type StagedDoc = {
  file: File;
  kind: (typeof DOC_KINDS)[number]["value"];
};

function ApplyClubPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const prefill = Route.useSearch();
  const createFn = useServerFn(createPendingClub);
  const attachFn = useServerFn(attachClubDocuments);

  // Derive validity of the `type` search param. The validator keeps the raw
  // string so we can render a helpful error when it doesn't match the enum.
  const validPrefillType =
    prefill.type && (CLUB_TYPES as readonly string[]).includes(prefill.type)
      ? (prefill.type as (typeof CLUB_TYPES)[number])
      : undefined;
  const invalidType = prefill.type && !validPrefillType ? prefill.type : null;

  const [form, setForm] = useState({
    name: prefill.name ?? "",
    type: validPrefillType ?? "motorcycle_riding",
    description: prefill.description ?? "",
    region: prefill.region ?? "",
    city: prefill.city ?? "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
  });
  const [docs, setDocs] = useState<StagedDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);




  function addFiles(files: FileList | null, kind: StagedDoc["kind"]) {
    if (!files || !files.length) return;
    const arr = Array.from(files).map((f) => ({ file: f, kind }));
    setDocs((prev) => [...prev, ...arr].slice(0, 6));
  }

  function removeDoc(idx: number) {
    setDocs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (docs.length === 0) {
      toast.error("At least one accreditation document is required");
      return;
    }
    if (form.description.trim().length < 20) {
      toast.error("Description must be at least 20 characters");
      return;
    }

    setSubmitting(true);
    try {
      const club = await createFn({
        data: {
          name: form.name.trim(),
          type: form.type as any,
          description: form.description.trim(),
          region: form.region.trim() || null,
          city: form.city.trim() || null,
          contact_email: form.contact_email.trim(),
          contact_phone: form.contact_phone.trim() || null,
          website_url: form.website_url.trim() || null,
        },
      });

      // Upload docs client-side using club id (satisfies storage RLS)
      const uploaded: Array<{ kind: StagedDoc["kind"]; storage_path: string; original_filename: string }> = [];
      for (const d of docs) {
        const ext = d.file.name.split(".").pop() ?? "bin";
        const path = `${club.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("club-docs")
          .upload(path, d.file, { upsert: false, contentType: d.file.type });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        uploaded.push({ kind: d.kind, storage_path: path, original_filename: d.file.name });
      }
      await attachFn({ data: { club_id: club.id, documents: uploaded } });

      toast.success("Application submitted — we'll review shortly.");
      navigate({ to: "/dashboard/clubs" });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Apply for a Club</h1>
          <p className="mt-2 text-muted-foreground">Please sign in to submit an application.</p>
          <Button asChild className="mt-4">
            <Link
              to="/auth"
              search={{ next: "/clubs/apply" } as any}
            >
              Sign in
            </Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Apply for a Club</h1>
        <p className="mt-2 text-muted-foreground">
          Clubs on 365 MotorSales are curated and verified. To keep the community high-signal, we
          require formal documentation before publishing.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <div className="font-semibold text-primary">What we accept</div>
            <ul className="mt-1 list-disc pl-4 text-muted-foreground">
              <li>LTO Accreditation (for riding clubs)</li>
              <li>SEC Certificate of Incorporation</li>
              <li>DTI registration / Business Permit</li>
              <li>Other formal government/organizational document (admin discretion)</li>
            </ul>
          </div>
        </div>

        {invalidType && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <div className="font-semibold text-destructive">
                We didn't recognise that club type ("{invalidType}")
              </div>
              <p className="mt-1 text-muted-foreground">
                Pick the closest match from the Type dropdown below, or start the guided flow to
                choose one.
              </p>
              <div className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/clubs/start">Use the guided flow</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {!validPrefillType && !invalidType && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-semibold">Not sure which type to pick?</div>
              <p className="mt-1 text-muted-foreground">
                The guided flow walks you through role, club type and basic details before you
                land here.{" "}
                <Link to="/clubs/start" className="font-medium text-primary hover:underline">
                  Start the guided flow
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Club name</Label>
              <Input
                id="name"
                required
                minLength={3}
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as (typeof CLUB_TYPES)[number] })}
              >
                <option value="motorcycle_riding">Motorcycle riding</option>
                <option value="car_club">Car club</option>
                <option value="off_road">Off-road</option>
                <option value="truck_club">Truck club</option>
                <option value="brand_owners">Brand owners</option>
                <option value="general_motoring">General motoring</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                maxLength={120}
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                maxLength={120}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                required
                minLength={20}
                maxLength={2000}
                rows={5}
                placeholder="Tell us about your club — mission, activities, membership rules…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact email</Label>
              <Input
                id="contact_email"
                type="email"
                required
                maxLength={200}
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Contact phone (optional)</Label>
              <Input
                id="contact_phone"
                maxLength={40}
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="website_url">Website / social page (optional)</Label>
              <Input
                id="website_url"
                type="url"
                maxLength={300}
                value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="font-semibold">Accreditation documents</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload at least one document. Files are stored privately and only visible to you and
              our reviewers.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {DOC_KINDS.map((k) => (
                <label
                  key={k.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm hover:border-primary"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{k.label}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/*"
                    onChange={(e) => addFiles(e.target.files, k.value)}
                  />
                </label>
              ))}
            </div>
            {docs.length > 0 && (
              <ul className="mt-4 space-y-2">
                {docs.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">
                      <span className="font-medium">{d.file.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        · {DOC_KINDS.find((k) => k.value === d.kind)?.label}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDoc(i)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button asChild type="button" variant="ghost">
              <Link to="/clubs">Cancel</Link>
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
