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
  ShieldCheck,
  ShieldX,
  XCircle,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { getMyClubStatus } from "@/lib/clubs.functions";

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
