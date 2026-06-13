import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  X,
  Eye,
  EyeOff,
  Star,
  Store as StoreIcon,
  ArrowRightLeft,
  Search,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ImportPlacesPanel } from "@/components/admin/import-places-panel";
import { TransferBusinessOwnerDialog } from "@/components/admin/transfer-business-owner-dialog";
import { BUSINESS_KIND_OPTIONS } from "@/data/business-kinds";


export const Route = createFileRoute("/admin/businesses")({
  component: AdminBusinessesPage,
});

type Row = {
  id: string;
  slug: string;
  name: string;
  type_slug: string;
  status: string;
  city: string | null;
  region: string | null;
  featured: boolean;
  created_at: string;
  rating_avg: number;
  rating_count: number;
  owner_id: string | null;
  subscription_tier: "free" | "listed" | "featured" | "premium" | null;
  featured_until: string | null;
  cancel_at_period_end?: boolean;
};

function subscriptionBadge(b: Row) {
  const tier = b.subscription_tier;
  if (!tier || tier === "free") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Free
      </Badge>
    );
  }
  const styles: Record<string, string> = {
    listed: "bg-slate-600",
    featured: "bg-primary",
    premium: "bg-amber-500 text-amber-950",
  };
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  if (!b.featured_until) {
    return <Badge className={styles[tier] ?? ""}>{tierLabel}</Badge>;
  }
  const dateLabel = formatDate(b.featured_until);
  const suffix = b.cancel_at_period_end ? `cancels ${dateLabel}` : `renews ${dateLabel}`;
  return (
    <Badge className={styles[tier] ?? ""}>
      {tierLabel} · {suffix}
    </Badge>
  );
}

function AdminBusinessesPage() {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "paid">("all");
  const [transferTarget, setTransferTarget] = useState<Row | null>(null);

  const load = async (status: string, q?: string, tier?: "all" | "free" | "paid") => {
    setLoading(true);
    let query = (supabase as any)
      .from("businesses")
      .select(
        "id,slug,name,type_slug,status,city,region,featured,created_at,rating_avg,rating_count,owner_id,subscription_tier,featured_until",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (status !== "all") query = query.eq("status", status);
    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(
        `name.ilike.%${term}%,slug.ilike.%${term}%,city.ilike.%${term}%,region.ilike.%${term}%`,
      );
    }
    const { data } = await query;
    let result: Row[] = data ?? [];

    // Tier filter (client-side — avoids stacking a second .or() on top of the search filter)
    const effectiveTier = tier ?? tierFilter;
    if (effectiveTier === "free") {
      result = result.filter((b) => !b.subscription_tier || b.subscription_tier === "free");
    } else if (effectiveTier === "paid") {
      result = result.filter((b) => b.subscription_tier && b.subscription_tier !== "free");
    }

    // Pull cancel_at_period_end for paying businesses so badges can show "renews" vs "cancels"
    const paidIds = result
      .filter((b) => b.subscription_tier && b.subscription_tier !== "free")
      .map((b) => b.id);
    if (paidIds.length) {
      const { data: subs } = await (supabase as any)
        .from("business_subscriptions")
        .select("business_id,cancel_at_period_end")
        .in("business_id", paidIds);
      const cancelMap = new Map<string, boolean>(
        (subs ?? []).map((s: any) => [s.business_id, !!s.cancel_at_period_end]),
      );
      result = result.map((b) => ({ ...b, cancel_at_period_end: cancelMap.get(b.id) }));
    }

    setRows(result);
    setLoading(false);
  };

  useEffect(() => {
    if (tab !== "import") load(tab, search, tierFilter); /* eslint-disable-next-line */
  }, [tab, tierFilter]);

  const moderate = async (id: string, patch: Partial<Row>) => {
    const { error } = await (supabase as any).from("businesses").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      load(tab, search);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Businesses moderation</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="hidden">Hidden</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="import">Import nearby</TabsTrigger>
        </TabsList>
        {tab === "import" ? (
          <TabsContent value="import" className="mt-4">
            <ImportPlacesPanel />
          </TabsContent>
        ) : (
          <TabsContent value={tab} className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, slug, city, region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") load(tab, search, tierFilter);
                }}
              />
              <Button onClick={() => load(tab, search, tierFilter)} variant="outline">
                <Search className="mr-1 h-4 w-4" />
                Search
              </Button>
              <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as "all" | "free" | "paid")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid (any)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
            ) : rows.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                <StoreIcon className="mx-auto mb-2 h-6 w-6 opacity-60" />
                Nothing here.
              </Card>
            ) : (
              <div className="space-y-2">
                {rows.map((b) => (
                  <Card
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/businesses/$slug"
                          params={{ slug: b.slug }}
                          className="truncate font-semibold hover:underline"
                        >
                          {b.name}
                        </Link>
                        {b.featured && <Badge>Featured</Badge>}
                        <Badge variant="outline">{b.status}</Badge>
                        {subscriptionBadge(b)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Type:</span>
                        <Select
                          value={b.type_slug}
                          onValueChange={(v) => moderate(b.id, { type_slug: v } as any)}
                        >
                          <SelectTrigger className="h-7 w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_KIND_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>
                          · {[b.city, b.region].filter(Boolean).join(", ") || "no location"}
                        </span>
                        {b.rating_count > 0 && (
                          <>
                            <span>·</span>
                            <Star className="inline h-3 w-3 fill-yellow-500 text-yellow-500" />{" "}
                            {Number(b.rating_avg).toFixed(1)} ({b.rating_count})
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Owner: <code>{b.owner_id ?? "none"}</code>
                      </div>

                    </div>
                    <div className="flex flex-wrap gap-2">
                      {b.status !== "active" && (
                        <Button
                          size="sm"
                          onClick={() => moderate(b.id, { status: "active" } as any)}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {b.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(b.id, { status: "rejected" } as any)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      )}
                      {b.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(b.id, { status: "hidden" } as any)}
                        >
                          <EyeOff className="mr-1 h-4 w-4" />
                          Hide
                        </Button>
                      )}
                      {b.status === "hidden" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(b.id, { status: "active" } as any)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Unhide
                        </Button>
                      )}
                      {b.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moderate(b.id, { featured: !b.featured })}
                        >
                          <Star
                            className={`mr-1 h-4 w-4 ${b.featured ? "fill-yellow-500 text-yellow-500" : ""}`}
                          />
                          {b.featured ? "Unfeature" : "Feature"}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setTransferTarget(b)}>
                        <ArrowRightLeft className="mr-1 h-4 w-4" />
                        Transfer owner
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {transferTarget && (
        <TransferBusinessOwnerDialog
          open={!!transferTarget}
          onOpenChange={(o) => {
            if (!o) setTransferTarget(null);
          }}
          businessId={transferTarget.id}
          businessName={transferTarget.name}
          currentOwnerId={transferTarget.owner_id}
          onTransferred={() => {
            setTransferTarget(null);
            load(tab, search);
          }}
        />
      )}
    </div>
  );
}
