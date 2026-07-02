import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldCheck,
  Users,
  UserPlus,
  BadgeCheck,
  QrCode,
  Radio,
  Megaphone,
  ListChecks,
  MessagesSquare,
  Rocket,
  Wallet,
  AlertTriangle,
  FileWarning,
  Bell,
  ClipboardCheck,
  ExternalLink,
} from "lucide-react";
import { formatPHP } from "@/lib/format";
import {
  getAdminOverview,
  type AdminOverviewData,
  type OverviewWindow,
  type OverviewRevenue,
  type TopReferrer,
} from "@/lib/admin-overview.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "0";
  return Number(n).toLocaleString();
}

function AdminOverview() {
  const call = useServerFn(getAdminOverview);
  const q = useQuery<AdminOverviewData>({
    queryKey: ["admin", "overview"],
    queryFn: () => call(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  if (q.isLoading) {
    return (
      <div>
        <h1 className="mb-6 font-display text-2xl font-bold">Overview</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div>
        <h1 className="mb-4 font-display text-2xl font-bold">Overview</h1>
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          Could not load overview: {(q.error as Error)?.message ?? "unknown error"}
        </div>
      </div>
    );
  }

  const d = q.data;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Live snapshot of users, referrals, marketplace productivity and site health.
          </p>
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {q.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {/* SITE HEALTH — surfaced first so ops see problems immediately */}
      <Section title="Site health" subtitle="Queues that need admin attention right now.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <HealthCard
            to="/admin/verifications"
            icon={ShieldCheck}
            label="Pending verifications"
            value={d.health.pendingVerifications}
            tone={d.health.pendingVerifications > 0 ? "warn" : "ok"}
          />
          <HealthCard
            to="/admin/payments"
            icon={Wallet}
            label="Pending payments"
            value={d.health.pendingPayments}
            tone={d.health.pendingPayments > 0 ? "warn" : "ok"}
          />
          <HealthCard
            to="/admin/payments"
            icon={AlertTriangle}
            label="Failed payments (24h)"
            value={d.health.failedPayments24h}
            tone={d.health.failedPayments24h > 0 ? "bad" : "ok"}
          />
          <HealthCard
            to="/admin/reports"
            icon={FileWarning}
            label="Open reports"
            value={d.health.openReports}
            tone={d.health.openReports > 0 ? "warn" : "ok"}
          />
          <HealthCard
            to="/admin/alerts"
            icon={Bell}
            label="Unacknowledged alerts"
            value={d.health.unacknowledgedAlerts}
            tone={d.health.unacknowledgedAlerts > 0 ? "warn" : "ok"}
          />
          <HealthCard
            to="/admin/claims"
            icon={ClipboardCheck}
            label="Pending claim reviews"
            value={d.health.pendingClaimReviews}
            tone={d.health.pendingClaimReviews > 0 ? "warn" : "ok"}
          />
        </div>
      </Section>

      {/* USER ACTIVITY */}
      <Section title="User activity" subtitle="Registrations, verified sellers and account state.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <SnapshotCard icon={Users} label="Total users" value={fmt(d.users.total)} />
          <WindowCard icon={UserPlus} label="New signups" window={d.users.signups} />
          <SnapshotCard
            icon={BadgeCheck}
            label="Verified sellers"
            value={fmt(d.users.verifiedSellers)}
          />
          <SnapshotCard
            icon={Users}
            label="Active accounts"
            value={fmt(d.users.activeAccounts)}
            hint={`${fmt(d.users.foundingMembers)} founding members`}
          />
        </div>
      </Section>

      {/* SCANS */}
      <Section
        title="365 staff & partner scans"
        subtitle="QR scans across staff cards and partner/influencer referral links."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <WindowCard icon={QrCode} label="QR scans" window={d.scans.total} />
          <SnapshotCard
            icon={Radio}
            label="Signups via referral (7d)"
            value={fmt(d.scans.partnerSignups7d)}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <TopReferrerList
            title="Top 365 staff (30d)"
            icon={ShieldCheck}
            rows={d.scans.topStaff}
            emptyLabel="No staff scans yet."
          />
          <TopReferrerList
            title="Top partners / influencers (30d)"
            icon={Megaphone}
            rows={d.scans.topPartners}
            emptyLabel="No partner scans yet."
          />
        </div>
      </Section>

      {/* PRODUCTIVITY */}
      <Section
        title="Marketplace productivity"
        subtitle="What's actually being created, boosted and paid for."
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <WindowCard icon={ListChecks} label="Listings created" window={d.productivity.listingsCreated} />
          <WindowCard icon={Rocket} label="Boosts sold" window={d.productivity.boostsSold} />
          <WindowCard icon={MessagesSquare} label="Messages sent" window={d.productivity.messagesSent} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <SnapshotCard
            icon={ListChecks}
            label="Active listings"
            value={fmt(d.productivity.activeListings)}
          />
          <SnapshotCard
            icon={Wallet}
            label="Listings awaiting payment"
            value={fmt(d.productivity.pendingPayment)}
          />
          <RevenueCard label="Revenue (paid)" window={d.productivity.revenue} />
          <SnapshotCard
            icon={Wallet}
            label="Revenue — all time"
            value={formatPHP(Number(d.productivity.revenueTotal) || 0)}
          />
        </div>
      </Section>
    </div>
  );
}

/* ------------------------------ subcomponents ------------------------------ */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

type IconType = React.ComponentType<{ className?: string }>;

function SnapshotCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: IconType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function WindowCard({
  icon: Icon,
  label,
  window,
}: {
  icon: IconType;
  label: string;
  window: OverviewWindow;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <TripletCell label="Today" value={fmt(window.today)} />
        <TripletCell label="7d" value={fmt(window.d7)} />
        <TripletCell label="30d" value={fmt(window.d30)} />
      </div>
    </div>
  );
}

function RevenueCard({ label, window }: { label: string; window: OverviewRevenue }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Wallet className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <TripletCell label="Today" value={formatPHP(Number(window.today) || 0)} />
        <TripletCell label="7d" value={formatPHP(Number(window.d7) || 0)} />
        <TripletCell label="30d" value={formatPHP(Number(window.d30) || 0)} />
      </div>
    </div>
  );
}

function TripletCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate font-display text-sm font-semibold" title={value}>
        {value}
      </div>
    </div>
  );
}

function HealthCard({
  to,
  icon: Icon,
  label,
  value,
  tone,
}: {
  to: string;
  icon: IconType;
  label: string;
  value: number;
  tone: "ok" | "warn" | "bad";
}) {
  const toneClasses =
    tone === "bad"
      ? "border-destructive/40 bg-destructive/5 text-destructive"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300"
        : "border-border bg-card text-muted-foreground";
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between rounded-xl border p-4 transition-colors hover:brightness-95 ${toneClasses}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide">{label}</div>
          <div className="mt-0.5 font-display text-xl font-bold text-foreground">{fmt(value)}</div>
        </div>
      </div>
      <ExternalLink className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-70" />
    </Link>
  );
}

function TopReferrerList({
  title,
  icon: Icon,
  rows,
  emptyLabel,
}: {
  title: string;
  icon: IconType;
  rows: TopReferrer[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={`${r.code}-${i}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{r.name || r.code}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  Code {r.code}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-semibold">{fmt(r.scans)}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  scans
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-semibold">{fmt(r.signups)}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  signups
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
