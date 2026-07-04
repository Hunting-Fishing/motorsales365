import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  Loader2,
  Mail,
  Paperclip,
  ShieldCheck,
  ShieldX,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getMyClubStatus, resubmitClubApplication } from "@/lib/clubs.functions";

const DOC_KINDS = [
  { value: "lto_accreditation", label: "LTO Accreditation" },
  { value: "sec_incorporation", label: "SEC Certificate of Incorporation" },
  { value: "dti_business_permit", label: "DTI / Business Permit" },
  { value: "other", label: "Other formal document" },
] as const;

type DocKind = (typeof DOC_KINDS)[number]["value"];
type StagedDoc = { file: File; kind: DocKind };

export const Route = createFileRoute("/clubs/apply/success")({
  head: () => ({
    meta: [
      { title: "Application submitted — 365 MotorSales Clubs" },
      {
        name: "description",
        content:
          "Your club application has been submitted. Our team reviews accreditation documents within a few business days.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => {
    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.trim().length > 0 ? v.slice(0, max) : undefined;
    return {
      club: str(s.club, 64),
      name: str(s.name, 120),
    };
  },
  component: ClubApplySuccessPage,
});

type ClubStatus = "pending" | "active" | "rejected" | "suspended";

const STATUS_META: Record<
  ClubStatus,
  {
    label: string;
    tone: string;
    Icon: typeof Clock;
    summary: string;
  }
> = {
  pending: {
    label: "Pending review",
    tone: "border-amber-500/40 bg-amber-500/10 text-amber-700",
    Icon: Clock,
    summary:
      "Our team is verifying your accreditation documents. Reviews usually take 1–3 business days.",
  },
  active: {
    label: "Approved & live",
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    Icon: ShieldCheck,
    summary:
      "Your club is approved and its public page is live. You can now add media, post rides & events, and invite members.",
  },
  rejected: {
    label: "Needs changes",
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
    Icon: XCircle,
    summary:
      "A reviewer flagged something in your application. See the review notes below and reply to our email to resubmit.",
  },
  suspended: {
    label: "Suspended",
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
    Icon: ShieldX,
    summary:
      "This club is currently suspended. Contact support to understand next steps.",
  },
};

function ClubApplySuccessPage() {
  const { club, name } = Route.useSearch();
  const fetchStatus = useServerFn(getMyClubStatus);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["club-apply-status", club],
    queryFn: () => (club ? fetchStatus({ data: { id: club } }) : Promise.resolve(null)),
    enabled: !!club,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const displayName = data?.name ?? name;
  const status = data?.status;
  const meta = status ? STATUS_META[status] : null;

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">
            Application submitted
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {displayName ? (
              <>
                Thanks — <span className="font-medium text-foreground">{displayName}</span> is now
                in the review queue.
              </>
            ) : (
              <>Thanks — your club is now in the review queue.</>
            )}
          </p>
        </div>

        {club && (
          <section
            aria-labelledby="status-heading"
            aria-live="polite"
            className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Current status
                </div>
                <h2 id="status-heading" className="mt-1 font-display text-lg font-semibold">
                  {isLoading
                    ? "Checking your application…"
                    : isError
                      ? "Couldn't load status"
                      : meta
                        ? meta.label
                        : "Status unavailable"}
                </h2>
              </div>
              {meta ? (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.tone}`}
                >
                  <meta.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {meta.label}
                </span>
              ) : isLoading ? (
                <Loader2
                  className="h-5 w-5 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {isError ? (
              <p className="mt-3 text-sm text-muted-foreground">
                We couldn't fetch the latest status. You can retry, or check "Your clubs" in the
                dashboard.
              </p>
            ) : meta ? (
              <p className="mt-3 text-sm text-muted-foreground">{meta.summary}</p>
            ) : null}

            {data?.review_notes && (
              <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="font-semibold text-foreground">Reviewer notes</div>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {data.review_notes}
                </p>
              </div>
            )}

            {data && (
              <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div>
                  <dt className="font-medium text-foreground">Documents</dt>
                  <dd>{data.document_count} uploaded</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Submitted</dt>
                  <dd>{new Date(data.created_at).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Last update</dt>
                  <dd>
                    {data.reviewed_at
                      ? new Date(data.reviewed_at).toLocaleDateString()
                      : new Date(data.updated_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            )}

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Refreshing…
                  </>
                ) : (
                  "Refresh status"
                )}
              </Button>
            </div>
          </section>
        )}

        <section
          aria-labelledby="next-steps-heading"
          className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 id="next-steps-heading" className="font-display text-lg font-semibold">
            What to expect next
          </h2>
          {status === "active" ? (
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-medium">You're approved</div>
                  <p className="text-sm text-muted-foreground">
                    Your public club page is live. Verified members are eligible for the 5% Club
                    Member Discount on internal 365 purchases.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-medium">Add logo, cover &amp; first post</div>
                  <p className="text-sm text-muted-foreground">
                    Open your club in the dashboard to add media, post a first ride or event, and
                    invite members.
                  </p>
                </div>
              </li>
            </ol>
          ) : status === "rejected" ? (
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-medium">Check your email</div>
                  <p className="text-sm text-muted-foreground">
                    Reply to the review email with the requested changes or new documents.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-medium">Update &amp; resubmit</div>
                  <p className="text-sm text-muted-foreground">
                    Open your club in the dashboard to upload new documents. We'll re-review once
                    you notify us.
                  </p>
                </div>
              </li>
            </ol>
          ) : (
            <ol className="mt-4 space-y-4">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-medium">Admin review (1–3 business days)</div>
                  <p className="text-sm text-muted-foreground">
                    Our team verifies your accreditation documents (LTO, SEC, DTI, or equivalent).
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-medium">We'll email you the decision</div>
                  <p className="text-sm text-muted-foreground">
                    You'll get a notification at the contact email you provided. If we need more
                    info, we'll reach out from there.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-medium">Publish and invite members</div>
                  <p className="text-sm text-muted-foreground">
                    Once approved, your club page goes live. You can then add a logo/cover, post
                    rides &amp; events, and invite members.
                  </p>
                </div>
              </li>
            </ol>
          )}
        </section>

        {club && status === "rejected" && (
          <ResubmitDocumentsPanel clubId={club} onResubmitted={() => refetch()} />
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline">
            <Link to="/clubs">Browse clubs</Link>
          </Button>
          {status === "active" && data?.slug ? (
            <Button asChild>
              <Link
                to="/clubs/$slug"
                params={{ slug: data.slug }}
                aria-label="View your live club page"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>View club page</span>
              </Link>
            </Button>
          ) : club ? (
            <Button
              asChild
              className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Link
                to="/dashboard/clubs_/$id"
                params={{ id: club }}
                aria-label="Open your club in the dashboard"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                <span>Open your club</span>
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/dashboard/clubs">Go to your clubs</Link>
            </Button>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

function ResubmitDocumentsPanel({
  clubId,
  onResubmitted,
}: {
  clubId: string;
  onResubmitted: () => void;
}) {
  const resubmitFn = useServerFn(resubmitClubApplication);
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocKind>("lto_accreditation");
  const [docs, setDocs] = useState<StagedDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const arr = Array.from(files).map((file) => ({ file, kind }));
    setDocs((prev) => [...prev, ...arr].slice(0, 6));
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeDoc(idx: number) {
    setDocs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (docs.length === 0) {
      toast.error("Attach at least one document to resubmit");
      return;
    }
    setSubmitting(true);
    try {
      const uploaded: Array<{
        kind: DocKind;
        storage_path: string;
        original_filename: string;
      }> = [];
      for (const d of docs) {
        const ext = d.file.name.split(".").pop() ?? "bin";
        const path = `${clubId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("club-docs")
          .upload(path, d.file, { upsert: false, contentType: d.file.type });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        uploaded.push({
          kind: d.kind,
          storage_path: path,
          original_filename: d.file.name,
        });
      }
      await resubmitFn({ data: { club_id: clubId, documents: uploaded } });
      toast.success("Documents resubmitted — we'll review shortly.");
      setDocs([]);
      onResubmitted();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to resubmit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="resubmit-heading"
      className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <h2 id="resubmit-heading" className="font-display text-lg font-semibold">
            Submit updated documents
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload replacement or additional accreditation files below. Once you resubmit, your
            application returns to the review queue.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <Label htmlFor="resubmit-kind" className="text-xs font-medium">
            Document type
          </Label>
          <Select value={kind} onValueChange={(v) => setKind(v as DocKind)}>
            <SelectTrigger id="resubmit-kind" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={submitting || docs.length >= 6}
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            <span>Add file{docs.length ? "s" : ""}</span>
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        PDF, JPG, or PNG. Up to 6 files per resubmission.
      </p>

      {docs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {docs.map((d, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-2 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {DOC_KINDS.find((k) => k.value === d.kind)?.label}
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeDoc(i)}
                disabled={submitting}
                aria-label={`Remove ${d.file.name}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link
            to="/dashboard/clubs_/$id"
            params={{ id: clubId }}
            aria-label="Open club in dashboard for a full edit"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <span>Open in dashboard for a full edit</span>
          </Link>
        </Button>
        <Button type="button" onClick={submit} disabled={submitting || docs.length === 0}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Resubmitting…</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Resubmit for review</span>
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
