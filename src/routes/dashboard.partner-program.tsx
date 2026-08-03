import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ResponsiveQr } from "@/components/qr/responsive-qr";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, ExternalLink, Inbox, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { siteOrigin } from "@/lib/site-config";
import { getMyPartnerProgramProfile } from "@/lib/partner-program.functions";
import { formatPHP } from "@/lib/format";
import { InfluencerDisclosure } from "@/components/influencer-disclosure";
import { usePromoterAnalytics } from "@/lib/use-promoter-analytics";


export const Route = createFileRoute("/dashboard/partner-program")({
  component: PartnerDashboard,
});

/** Shared card interaction pattern across the partner dashboard. */
const INTERACTIVE_CARD =
  "rounded-2xl border-border/70 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0 active:shadow-sm";

function PartnerDashboard() {
  const fetchProfile = useServerFn(getMyPartnerProgramProfile);
  const { trackCta } = usePromoterAnalytics("dashboard_partner_program");
  const { data, isLoading } = useQuery({
    queryKey: ["partner-program", "me"],
    queryFn: () => fetchProfile({}),
  });


  if (isLoading) {
    return (
      <SiteLayout>
        <div
          className="container mx-auto max-w-5xl px-4 py-8"
          role="status"
          aria-label="Loading your partner dashboard"
        >
          {/* Hero skeleton */}
          <Skeleton className="h-40 w-full rounded-3xl" />

          {/* QR + stats skeleton */}
          <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
            <Skeleton className="h-[300px] rounded-2xl" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>

          {/* Section skeletons */}
          <Skeleton className="mt-6 h-72 rounded-2xl" />
          <Skeleton className="mt-6 h-48 rounded-2xl" />
          <Skeleton className="mt-6 h-40 rounded-2xl" />
        </div>
      </SiteLayout>
    );
  }


  if (!data?.partner) {
    const application = (data as any)?.application ?? null;
    const status = application?.status as "pending" | "approved" | "rejected" | undefined;

    if (application && status !== "rejected") {
      return (
        <SiteLayout>
          <div className="container mx-auto max-w-2xl px-4 py-10 text-center">
            <h1 className="font-display text-3xl font-bold">Partner Program</h1>
            <Badge className="mt-3 bg-amber-500 text-white hover:bg-amber-500">
              Application received
            </Badge>
            <p className="mt-3 text-muted-foreground">
              Thanks — your application was submitted
              {application.created_at
                ? ` on ${new Date(application.created_at).toLocaleDateString()}`
                : ""}{" "}
              and is now waiting for admin review. You don't need to apply again. Once approved,
              your referral code and QR code will appear right here.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link to="/partner-program">Apply now</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/partner-program/info">Learn more</Link>
              </Button>
            </div>
          </div>
        </SiteLayout>
      );
    }

    return (
      <SiteLayout>
        <div className="container mx-auto max-w-2xl px-4 py-10 text-center">
          <h1 className="font-display text-3xl font-bold">Partner Program</h1>
          <p className="mt-2 text-muted-foreground">
            {status === "rejected"
              ? "Your previous application wasn't approved. You're welcome to apply again with updated details."
              : "You're not an approved partner yet."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild><Link to="/partner-program">Apply now</Link></Button>
            <Button asChild variant="outline"><Link to="/partner-program/info">Learn more</Link></Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const partner = data.partner as any;
  const link = `${siteOrigin()}/?ref=${partner.referral_code}`;
  const totals = data.totals!;
  const events = data.events;

  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"));

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Premium header */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                Partner dashboard
              </span>
              <h1 className="font-display mt-3 truncate text-2xl font-bold sm:text-4xl">
                {partner.display_name}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                Referral code{" "}
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {partner.referral_code}
                </code>
              </p>
            </div>
            <Badge
              className={
                partner.active
                  ? "shrink-0 bg-emerald-500 text-white hover:bg-emerald-500"
                  : "shrink-0 bg-white/15 text-white hover:bg-white/15"
              }
            >
              {partner.active ? "● Active" : "Paused"}
            </Badge>
          </div>
        </div>

        {/* QR + stats overlap */}
        <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
          <Card className="flex flex-col items-center gap-3 rounded-2xl border-border/70 p-5 shadow-sm">
            <div className="w-full max-w-[220px] min-w-0 rounded-2xl border border-border/60 bg-white p-3">
              <ResponsiveQr value={link} maxPx={200} minPx={140} />
            </div>
            <p className="text-xs text-muted-foreground text-center break-all">{link}</p>
            <Button
              size="sm"
              variant="outline"
              aria-label="Copy referral link to clipboard"
              className="w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => {
                trackCta("copy_link", { partner_code: partner.referral_code });
                copy(link);
              }}

            >
              <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Copy link
            </Button>

          </Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Pending", value: totals.pending, tile: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
              { label: "Approved", value: totals.approved, tile: "bg-primary/10 text-primary" },
              { label: "Paid", value: totals.paid, tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
              { label: "Clawed back", value: totals.clawed_back, tile: "bg-destructive/10 text-destructive" },
            ].map((s) => (
              <Card key={s.label} className={`p-4 ${INTERACTIVE_CARD}`}>
                <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${s.tile}`}>
                  {s.label}
                </span>
                <p className="mt-3 text-xl font-bold tabular-nums">{formatPHP(s.value)}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Disclosure verification */}
        <Card className="mt-6 overflow-hidden rounded-2xl border-border/70 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="font-semibold">Disclosure verification</h2>
              <p className="text-xs text-muted-foreground">
                Exact previews of what visitors see on your referral surfaces.
              </p>
            </div>
            <Badge className="shrink-0 bg-emerald-600 hover:bg-emerald-600">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Live
            </Badge>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Banner (top of referral landing)
              </p>
              <InfluencerDisclosure variant="banner" partnerName={partner.display_name} analyticsSurface="dashboard_partner_program" partnerCode={partner.referral_code} />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Inline (in cards / posts)
              </p>
              <div className="rounded-2xl border border-border bg-card p-3">
                <InfluencerDisclosure variant="inline" partnerName={partner.display_name} analyticsSurface="dashboard_partner_program" partnerCode={partner.referral_code} />
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Footer (bottom of referral landing)
              </p>
              <div className="rounded-2xl border border-border bg-card px-4 pb-3">
                <InfluencerDisclosure variant="footer" partnerName={partner.display_name} analyticsSurface="dashboard_partner_program" partnerCode={partner.referral_code} />
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-muted/30 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Where it appears
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                `Your referral landing page (/r/${partner.referral_code}) — top banner + footer`,
                "Partner Program overview page",
                "Partner application page",
                "This dashboard",
              ].map((label) => (
                <li key={label} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border p-5 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Copy-ready snippet
              </p>
              <code className="mt-1 block truncate text-sm sm:whitespace-normal">
                I may earn a commission if you sign up through my 365 Motor Sales link.
              </code>
            </div>
            <div className="col-span-2 flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  trackCta("copy_snippet", { partner_code: partner.referral_code, meta: { location: "disclosure_verification" } });
                  copy("I may earn a commission if you sign up through my 365 Motor Sales link.");
                }}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copy
              </Button>
              <Button size="sm" asChild>
                <a
                  href={`/r/${partner.referral_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackCta("view_live", { partner_code: partner.referral_code })}
                >
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> View live
                </a>
              </Button>

            </div>
          </div>
        </Card>


        <Card className="mt-6 overflow-hidden rounded-2xl border-border/70 shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="font-semibold">Commission events</h2>
            <p className="text-xs text-muted-foreground">
              Aggregated line items only — no customer personal information is shown.
            </p>
          </div>
          <div className="divide-y divide-border">
            {events.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-6 w-6" aria-hidden="true" />}
                title="No commission events yet"
                body="Once a referred user takes a qualifying action, it will appear here."
              />
            ) : (

              events.map((e: any) => (
                <div key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium capitalize">{e.event_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.event_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatPHP(Number(e.commission_php))}</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {String(e.status).replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="mt-6 overflow-hidden rounded-2xl border-border/70 shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="font-semibold">Payout history</h2>
          </div>
          <div className="divide-y divide-border">
            {((data as any).payouts ?? []).length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-6 w-6" aria-hidden="true" />}
                title="No payouts yet"
                body="Approved commissions become payable once they clear the refund window."
              />
            ) : (

              (data as any).payouts.map((p: any) => (
                <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium capitalize">{p.method}{p.reference ? ` · ${p.reference}` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                      {p.paid_at ? ` · paid ${new Date(p.paid_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatPHP(Number(p.amount_php))}</p>
                    <Badge variant="outline" className="mt-1 capitalize">{p.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="mt-6">
          <InfluencerDisclosure analyticsSurface="dashboard_partner_program" partnerCode={partner.referral_code} />
        </div>

      </div>
    </SiteLayout>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
