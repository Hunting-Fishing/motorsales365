import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Star,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  FileWarning,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { getUserAdminDossier } from "@/lib/admin-user-dossier.functions";
import { UserDossierDialog } from "./user-dossier-dialog";
import { AccountTeamStrip } from "./account-team-strip";
import { TierBadge } from "@/components/tier-badge";
import { getUserTier } from "@/lib/tiers.functions";

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "good";
}) {
  const toneCls =
    tone === "danger"
      ? "border-destructive/30 bg-destructive/5"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/5"
        : tone === "good"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-background/60";
  return (
    <div className={`rounded-lg border ${toneCls} p-3`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

const php = (n: number) =>
  "₱" + Math.round(n).toLocaleString("en-PH", { maximumFractionDigits: 0 });

export function PostingUserPanel({ userId }: { userId: string }) {
  const [open, setOpen] = useState(true);
  const [dossierOpen, setDossierOpen] = useState(false);
  const fetchFn = useServerFn(getUserAdminDossier);
  const tierFn = useServerFn(getUserTier);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-dossier", userId],
    queryFn: () => fetchFn({ data: { userId } }),
    staleTime: 60_000,
  });
  const { data: tierData } = useQuery({
    queryKey: ["user-tier", userId],
    queryFn: () => tierFn({ data: { userId } }),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-background/40 p-4">
        <Skeleton className="h-24 w-full" />
      </section>
    );
  }
  if (!data) return null;

  const { identity, stats, score } = data;
  const displayName =
    identity.full_name ||
    [identity.first_name, identity.last_name].filter(Boolean).join(" ") ||
    identity.business_name ||
    identity.email ||
    "Unknown user";
  const memberBadge = identity.member_number
    ? `User #${identity.member_number.toLocaleString()}`
    : null;

  const scoreColor =
    score.band === "high"
      ? "text-emerald-600 dark:text-emerald-400"
      : score.band === "mid"
        ? "text-amber-600 dark:text-amber-400"
        : "text-destructive";
  const ScoreIcon =
    score.band === "high" ? ShieldCheck : score.band === "mid" ? Shield : ShieldAlert;

  return (
    <section className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
      {/* Identity strip */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-base font-bold text-primary">
          {identity.avatar_url ? (
            <img src={identity.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            displayName.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Posting user
            </div>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="truncate text-base font-bold text-foreground">{displayName}</span>
            {tierData?.tierId && <TierBadge tierId={tierData.tierId} size="xs" />}
            {memberBadge && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {memberBadge}
              </Badge>
            )}
            {identity.verification_status === "verified" || identity.verified_at ? (
              <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 className="mr-0.5 h-3 w-3" /> Verified
              </Badge>
            ) : null}
            {identity.is_founding_member && (
              <Badge className="border border-amber-500/30 bg-amber-500/15 text-[10px] text-amber-700 hover:bg-amber-500/15 dark:text-amber-300">
                <Star className="mr-0.5 h-3 w-3" /> Founder
                {identity.founding_member_number ? ` #${identity.founding_member_number}` : ""}
              </Badge>
            )}
            {identity.account_status && identity.account_status !== "active" && (
              <Badge variant="destructive" className="text-[10px]">
                {identity.account_status}
              </Badge>
            )}
            {identity.seller_type && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {identity.seller_type}
              </Badge>
            )}
          </div>
          {identity.business_name && identity.full_name && (
            <div className="truncate text-xs font-medium text-muted-foreground">
              {identity.business_name}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {identity.email && (
              <a href={`mailto:${identity.email}`} className="inline-flex items-center gap-1 hover:underline">
                <Mail className="h-3 w-3" /> {identity.email}
              </a>
            )}
            {identity.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {identity.phone}
              </span>
            )}
            {(identity.city || identity.region) && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[identity.city, identity.region].filter(Boolean).join(", ")}
              </span>
            )}
            {identity.created_at && <span>Joined {formatDate(identity.created_at)}</span>}
          </div>
        </div>

        {/* Score + actions */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Trust score
            </div>
            <div className={`flex items-center gap-1 text-2xl font-black ${scoreColor}`}>
              <ScoreIcon className="h-5 w-5" />
              {score.score}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button size="sm" variant="default" onClick={() => setDossierOpen(true)}>
              Open dossier
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/users" search={{ q: identity.email ?? identity.id } as any}>
                <ExternalLink className="mr-1 h-3 w-3" /> Manage
              </Link>
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setOpen((s) => !s)}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      {open && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile
            icon={FileWarning}
            label="Reports against"
            value={stats.reports_against_total}
            hint={`${stats.reports_against_open} open · ${stats.reports_taken_down} taken down`}
            tone={stats.reports_taken_down > 0 ? "danger" : stats.reports_against_open > 0 ? "warn" : "default"}
          />
          <StatTile
            icon={TrendingUp}
            label="Listings"
            value={stats.listings_active + stats.listings_hidden + stats.listings_other}
            hint={`${stats.listings_active} active · ${stats.listings_hidden} hidden`}
          />
          <StatTile
            icon={Wallet}
            label="Revenue (₱)"
            value={php(stats.revenue_lifetime_php)}
            hint={`${php(stats.revenue_90d_php)} last 90d`}
            tone={stats.revenue_lifetime_php > 0 ? "good" : "default"}
          />
          <StatTile
            icon={Eye}
            label="Views / Favorites"
            value={`${stats.listing_views.toLocaleString()}`}
            hint={`${stats.favorites_received.toLocaleString()} favorites`}
          />
          <StatTile
            icon={Heart}
            label="Affiliate clicks"
            value={stats.affiliate_clicks.toLocaleString()}
            hint={
              stats.seller_rating_avg != null
                ? `★ ${stats.seller_rating_avg.toFixed(1)} (${stats.seller_rating_count})`
                : "No reviews"
            }
          />
          <StatTile
            icon={MessageSquare}
            label="Admin contact"
            value={stats.admin_messages + stats.support_tickets}
            hint={`${stats.support_tickets} tickets · ${stats.admin_actions} actions`}
          />
        </div>
      )}

      {open && <AccountTeamStrip userId={userId} />}



      <UserDossierDialog
        open={dossierOpen}
        onOpenChange={setDossierOpen}
        userId={userId}
        identity={identity}
        stats={stats}
        score={score}
      />
    </section>
  );
}
