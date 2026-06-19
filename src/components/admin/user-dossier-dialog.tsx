import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  FileWarning,
  ListChecks,
  MessageSquare,
  Wallet,
  ExternalLink,
  CheckCircle2,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import {
  listUserReports,
  listUserListings,
  listUserCommunications,
  listUserBilling,
  type DossierIdentity,
  type DossierStats,
  type DossierScore,
} from "@/lib/admin-user-dossier.functions";
import { AccountTeamStrip } from "./account-team-strip";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { useAuth } from "@/hooks/use-auth";

const SUPER_ADMIN_EMAIL = "jordilwbailey@gmail.com";

const php = (n: number | string | null | undefined) =>
  "₱" + Math.round(Number(n ?? 0)).toLocaleString("en-PH", { maximumFractionDigits: 0 });

export function UserDossierDialog({
  open,
  onOpenChange,
  userId,
  identity,
  stats,
  score,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  identity: DossierIdentity;
  stats: DossierStats;
  score: DossierScore;
}) {
  const [tab, setTab] = useState("overview");
  const { user: authUser } = useAuth();
  const isSuperAdmin = (authUser?.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL;
  const displayName =
    identity.full_name || identity.business_name || identity.email || "User";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{displayName}</span>
            {identity.member_number != null && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                User #{identity.member_number.toLocaleString()}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              Trust {score.score}
            </Badge>
            {isSuperAdmin && (
              <span className="ml-auto">
                <ResetPasswordDialog user={{ id: userId, full_name: displayName }} />
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">
              <Users className="mr-1 h-3.5 w-3.5" /> Team
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileWarning className="mr-1 h-3.5 w-3.5" /> Reports
            </TabsTrigger>
            <TabsTrigger value="listings">
              <ListChecks className="mr-1 h-3.5 w-3.5" /> Listings
            </TabsTrigger>
            <TabsTrigger value="comms">
              <MessageSquare className="mr-1 h-3.5 w-3.5" /> Comms
            </TabsTrigger>
            <TabsTrigger value="billing">
              <Wallet className="mr-1 h-3.5 w-3.5" /> Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <OverviewTab identity={identity} stats={stats} score={score} />
          </TabsContent>
          <TabsContent value="team" className="mt-4">
            {open && <AccountTeamStrip userId={userId} />}
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            {open && <ReportsTab userId={userId} />}
          </TabsContent>
          <TabsContent value="listings" className="mt-4">
            {open && <ListingsTab userId={userId} />}
          </TabsContent>
          <TabsContent value="comms" className="mt-4">
            {open && <CommsTab userId={userId} />}
          </TabsContent>
          <TabsContent value="billing" className="mt-4">
            {open && <BillingTab userId={userId} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function OverviewTab({
  identity,
  stats,
  score,
}: {
  identity: DossierIdentity;
  stats: DossierStats;
  score: DossierScore;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Identity
          </div>
          <div className="mt-1 space-y-1">
            {identity.email && <div>📧 {identity.email}</div>}
            {identity.phone && <div>📞 {identity.phone}</div>}
            {identity.business_name && <div>🏢 {identity.business_name}</div>}
            {identity.seller_type && <div>Type: {identity.seller_type}</div>}
            {identity.account_status && (
              <div>
                Status:{" "}
                <Badge variant={identity.account_status === "active" ? "secondary" : "destructive"}>
                  {identity.account_status}
                </Badge>
              </div>
            )}
            {identity.created_at && <div>Joined: {formatDate(identity.created_at)}</div>}
          </div>
        </div>
        <div className="rounded-md border border-border bg-background/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trust score breakdown ({score.score}/100)
          </div>
          <div className="mt-1 space-y-1">
            {score.breakdown.length === 0 ? (
              <div className="text-muted-foreground">Baseline.</div>
            ) : (
              score.breakdown.map((b, i) => (
                <div key={i} className="flex justify-between">
                  <span>{b.label}</span>
                  <span
                    className={
                      b.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }
                  >
                    {b.delta > 0 ? "+" : ""}
                    {b.delta}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Reports" value={stats.reports_against_total} />
        <Stat label="Taken down" value={stats.reports_taken_down} />
        <Stat label="Listings" value={stats.listings_active + stats.listings_hidden} />
        <Stat label="Lifetime ₱" value={php(stats.revenue_lifetime_php)} />
        <Stat label="Views" value={stats.listing_views.toLocaleString()} />
        <Stat label="Favorites" value={stats.favorites_received.toLocaleString()} />
        <Stat label="Affiliate clicks" value={stats.affiliate_clicks.toLocaleString()} />
        <Stat
          label="Reviews"
          value={
            stats.seller_rating_avg != null
              ? `★ ${stats.seller_rating_avg.toFixed(1)} (${stats.seller_rating_count})`
              : "—"
          }
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-border bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-bold">{value}</div>
    </div>
  );
}

function ReportsTab({ userId }: { userId: string }) {
  const fn = useServerFn(listUserReports);
  const { data, isLoading } = useQuery({
    queryKey: ["dossier-reports", userId],
    queryFn: () => fn({ data: { userId } }),
  });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const rows = data?.rows ?? [];
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">No reports filed against this user.</p>;
  return (
    <div className="space-y-2 text-sm">
      {rows.map((r: any) => (
        <div key={r.id} className="rounded border border-border bg-background/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={r.status === "resolved" ? "secondary" : "destructive"}>
              {r.status}
              {r.resolution ? ` · ${r.resolution}` : ""}
            </Badge>
            {r.category && <Badge variant="outline">{r.category}</Badge>}
            <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
          </div>
          <div className="mt-1 font-medium">{r.listings?.title ?? "Listing"}</div>
          <div className="text-muted-foreground">{r.reason}</div>
        </div>
      ))}
    </div>
  );
}

function ListingsTab({ userId }: { userId: string }) {
  const fn = useServerFn(listUserListings);
  const { data, isLoading } = useQuery({
    queryKey: ["dossier-listings", userId],
    queryFn: () => fn({ data: { userId } }),
  });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const rows = data?.rows ?? [];
  if (!rows.length) return <p className="text-sm text-muted-foreground">No listings.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="p-2 text-left">Title</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Views</th>
            <th className="p-2 text-left">Created</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l: any) => (
            <tr key={l.id} className="border-t border-border">
              <td className="p-2 font-medium">{l.title}</td>
              <td className="p-2">
                <Badge variant={l.status === "active" ? "secondary" : "outline"}>{l.status}</Badge>
              </td>
              <td className="p-2 text-right">{php(l.price_php)}</td>
              <td className="p-2 text-right">{(l.view_count ?? 0).toLocaleString()}</td>
              <td className="p-2 text-xs text-muted-foreground">{formatDate(l.created_at)}</td>
              <td className="p-2">
                <Link
                  to="/listing/$id"
                  params={{ id: l.id }}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommsTab({ userId }: { userId: string }) {
  const fn = useServerFn(listUserCommunications);
  const { data, isLoading } = useQuery({
    queryKey: ["dossier-comms", userId],
    queryFn: () => fn({ data: { userId } }),
  });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const rows = data?.rows ?? [];
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">No communications on record.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {rows.map((r: any) => (
        <li key={`${r.kind}-${r.id}`} className="rounded border-l-4 border-primary/40 bg-background/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">
              {r.kind.replace("_", " ")}
            </Badge>
            <span className="font-medium">{r.title}</span>
            {r.status && <Badge variant="secondary">{r.status}</Badge>}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDate(r.created_at)}
            </span>
          </div>
          {r.body && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{r.body}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

function BillingTab({ userId }: { userId: string }) {
  const fn = useServerFn(listUserBilling);
  const { data, isLoading } = useQuery({
    queryKey: ["dossier-billing", userId],
    queryFn: () => fn({ data: { userId } }),
  });
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (!data) return null;
  const { payments, subscriptions, bundles, boosts } = data;
  const empty =
    payments.length === 0 && subscriptions.length === 0 && bundles.length === 0 && boosts.length === 0;
  if (empty)
    return <p className="text-sm text-muted-foreground">No billing activity.</p>;
  return (
    <div className="space-y-4 text-sm">
      {subscriptions.length > 0 && (
        <Section title="Subscriptions">
          {subscriptions.map((s: any) => (
            <Row
              key={s.id}
              left={
                <>
                  <Badge variant="secondary">{s.plan_id ?? "plan"}</Badge>{" "}
                  <Badge variant="outline">{s.status}</Badge>
                </>
              }
              right={s.current_period_end ? `ends ${formatDate(s.current_period_end)}` : ""}
            />
          ))}
        </Section>
      )}
      {payments.length > 0 && (
        <Section title="Payments">
          {payments.map((p: any) => (
            <Row
              key={p.id}
              left={
                <>
                  <span className="font-mono text-xs">{p.invoice_number ?? p.id.slice(0, 8)}</span>{" "}
                  <Badge variant="outline">{p.kind}</Badge>{" "}
                  <Badge variant={p.status === "paid" ? "secondary" : "destructive"}>
                    {p.status}
                  </Badge>
                </>
              }
              right={`${php(p.amount_php)} · ${formatDate(p.created_at)}`}
            />
          ))}
        </Section>
      )}
      {bundles.length > 0 && (
        <Section title="Bundle purchases">
          {bundles.map((b: any) => (
            <Row
              key={b.id}
              left={
                <>
                  <Badge variant="secondary">{b.bundle_id}</Badge>{" "}
                  <Badge variant="outline">{b.status}</Badge>
                </>
              }
              right={`${php(b.price_paid_php)} · ${formatDate(b.created_at)}`}
            />
          ))}
        </Section>
      )}
      {boosts.length > 0 && (
        <Section title="Listing boosts">
          {boosts.map((b: any) => (
            <Row
              key={b.id}
              left={
                <>
                  <Badge variant="secondary">{b.product_slug}</Badge>
                </>
              }
              right={`${formatDate(b.starts_at)} → ${formatDate(b.ends_at)}`}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-background/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">{left}</div>
      <div className="text-xs text-muted-foreground">{right}</div>
    </div>
  );
}
