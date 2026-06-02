import { createFileRoute, Link } from "@tanstack/react-router";
import { confirm } from "@/components/ui/confirm-dialog";
import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Star,
  Eye,
  Rocket,
  RefreshCcw,
  CheckCircle2,
  Edit,
  Undo2,
  Clock,
  Heart,
  Bookmark,
  MessageSquare,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatPHP, formatDate } from "@/lib/format";
import placeholderCar from "@/assets/placeholder-car.webp";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { ListingQr } from "@/components/listing-qr";
import { BoostDialog } from "@/components/boost-dialog";

export const Route = createFileRoute("/dashboard/")({
  component: MyListings,
});

type Stats = {
  likes: number;
  saves: number;
  messages: number;
  views7: number;
  viewsPrev7: number;
  views30: number;
  viewsPrev30: number;
  spark: number[]; // last 7 days view counts oldest→newest
};

function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [soldTarget, setSoldTarget] = useState<{ id: string; title: string } | null>(null);
  const [stats, setStats] = useState<Record<string, Stats>>({});

  const loadStats = async (ids: string[]) => {
    if (ids.length === 0) return;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const since30 = new Date(now - 30 * day).toISOString();
    const since60 = new Date(now - 60 * day).toISOString();

    const [likesRes, savesRes, msgsRes, viewsRes] = await Promise.all([
      supabase.from("listing_likes").select("listing_id").in("listing_id", ids),
      supabase.from("favorites").select("listing_id").in("listing_id", ids),
      supabase.from("messages").select("listing_id").in("listing_id", ids),
      supabase
        .from("listing_views")
        .select("listing_id,created_at")
        .in("listing_id", ids)
        .gte("created_at", since60),
    ]);

    const map: Record<string, Stats> = {};
    ids.forEach((id) => {
      map[id] = {
        likes: 0,
        saves: 0,
        messages: 0,
        views7: 0,
        viewsPrev7: 0,
        views30: 0,
        viewsPrev30: 0,
        spark: Array(7).fill(0),
      };
    });
    (likesRes.data ?? []).forEach((r: any) => {
      if (map[r.listing_id]) map[r.listing_id].likes++;
    });
    (savesRes.data ?? []).forEach((r: any) => {
      if (map[r.listing_id]) map[r.listing_id].saves++;
    });
    (msgsRes.data ?? []).forEach((r: any) => {
      if (map[r.listing_id]) map[r.listing_id].messages++;
    });
    (viewsRes.data ?? []).forEach((r: any) => {
      const s = map[r.listing_id];
      if (!s) return;
      const age = now - new Date(r.created_at).getTime();
      if (age < 7 * day) s.views7++;
      else if (age < 14 * day) s.viewsPrev7++;
      if (age < 30 * day) s.views30++;
      else if (age < 60 * day) s.viewsPrev30++;
      if (age < 7 * day) {
        const dayIdx = 6 - Math.floor(age / day);
        if (dayIdx >= 0 && dayIdx < 7) s.spark[dayIdx]++;
      }
    });
    setStats(map);
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select(
        "id,title,price_php,status,plan,boost_until,view_count,published_at,created_at,expires_at,category_slug,listing_media(url,type)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setListings(data ?? []);
    setLoading(false);
    await loadStats((data ?? []).map((l: any) => l.id));
  };

  useEffect(() => {
    load();
    supabase
      .from("pricing_settings")
      .select("key,value")
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach((r: any) => (map[r.key] = Number(r.value)));
        setPricing(map);
      });
    // reason: `load` is recreated each render; depend only on user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remove = async (id: string) => {
    if (
      !(await confirm({ title: "Delete this listing? This cannot be undone.", destructive: true }))
    )
      return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Listing deleted");
      load();
    }
  };

  const confirmMarkSold = async () => {
    if (!soldTarget) return;
    const { error } = await supabase
      .from("listings")
      .update({ status: "sold" })
      .eq("id", soldTarget.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Marked as sold");
      load();
    }
    setSoldTarget(null);
  };

  const undoSold = async (id: string) => {
    const days = pricing.listing_expiry_days ?? 60;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    const { error } = await supabase
      .from("listings")
      .update({ status: "active", expires_at: expires.toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Listing restored to active");
      load();
    }
  };

  const togglePendingSale = async (l: any) => {
    const next = l.status === "pending_sale" ? "active" : "pending_sale";
    const message =
      next === "pending_sale"
        ? "Mark this listing as Pending Sale? It stays visible and buyers can still send offers."
        : "Cancel pending sale and return this listing to Active?";
    if (!(await confirm({ title: message, destructive: true }))) return;
    const { error } = await supabase.from("listings").update({ status: next }).eq("id", l.id);
    if (error) toast.error(error.message);
    else {
      toast.success(
        next === "pending_sale" ? "Marked as Pending Sale" : "Listing returned to Active",
      );
      load();
    }
  };

  const renew = async (id: string) => {
    const days = pricing.listing_expiry_days ?? 60;
    const expires = new Date();
    expires.setDate(expires.getDate() + days);
    const { error } = await supabase
      .from("listings")
      .update({ expires_at: expires.toISOString(), status: "active" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Renewed for ${days} days`);
      load();
    }
  };

  // Boost is now handled via <BoostDialog /> (Stripe-powered).

  const statusColor: Record<string, string> = {
    active: "bg-success text-success-foreground",
    pending_payment: "bg-warning text-warning-foreground",
    draft: "bg-secondary text-secondary-foreground",
    expired: "bg-muted text-muted-foreground",
    hidden: "bg-muted text-muted-foreground",
    sold: "bg-primary text-primary-foreground",
    pending_sale: "bg-warning text-warning-foreground",
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold">My listings</h1>
          <p className="text-sm text-muted-foreground">Manage your active and pending ads.</p>
        </div>
        <Button asChild>
          <Link to="/sell">
            <Plus className="mr-1 h-4 w-4" />
            New listing
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">You haven't posted anything yet.</p>
          <Button asChild className="mt-4">
            <Link to="/sell">Post your first listing</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => {
            const photo = (l.listing_media ?? []).find((m: any) => m.type === "photo");
            const boosted = l.boost_until && new Date(l.boost_until) > new Date();
            const expiring =
              l.expires_at &&
              new Date(l.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
            return (
              <div
                key={l.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row"
              >
                <div className="h-24 w-32 shrink-0 overflow-hidden rounded-md bg-secondary">
                  <ImageWithSkeleton src={photo?.url || placeholderCar} alt={l.title ? `${l.title} cover photo` : "Listing cover photo"} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={statusColor[l.status] ?? ""}>
                      {l.status.replace("_", " ")}
                    </Badge>
                    {boosted && (
                      <Badge className="bg-accent text-accent-foreground">
                        <Star className="mr-1 h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                    {l.plan === "upgraded" && <Badge variant="secondary">Upgraded</Badge>}
                    {expiring && l.status === "active" && (
                      <Badge variant="outline" className="border-warning text-warning">
                        Expiring soon
                      </Badge>
                    )}
                  </div>
                  <Link
                    to="/listing/$id"
                    params={{ id: l.id }}
                    className="mt-1 block font-semibold hover:text-primary"
                  >
                    {l.title}
                  </Link>
                  <div className="mt-1 text-lg font-bold text-primary">
                    {formatPHP(l.price_php)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {l.view_count} views
                    </span>
                    <span>Created {formatDate(l.created_at)}</span>
                    {l.expires_at && <span>Expires {formatDate(l.expires_at)}</span>}
                  </div>
                  <ListingStats stats={stats[l.id]} />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/listing/$id/edit" params={{ id: l.id }}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <ListingQr
                    listingId={l.id}
                    title={l.title}
                    pricePhp={l.price_php}
                    coverUrl={photo?.url ?? null}
                    compact
                  />
                  <BoostDialog listingId={l.id} listingTitle={l.title}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        boosted ||
                        !(
                          l.status === "active" ||
                          (l.status === "pending_sale" &&
                            (pricing.pending_sale_boost_eligible ?? 1) === 1)
                        )
                      }
                      title={
                        boosted
                          ? "Already boosted"
                          : l.status === "pending_sale" &&
                              (pricing.pending_sale_boost_eligible ?? 1) !== 1
                            ? "Boost disabled for Pending Sale listings"
                            : "Boost listing"
                      }
                    >
                      <Rocket className="h-4 w-4" />
                    </Button>
                  </BoostDialog>

                  <Button variant="outline" size="sm" onClick={() => renew(l.id)} title="Renew">
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  {l.status !== "sold" && (
                    <Button
                      variant={l.status === "pending_sale" ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePendingSale(l)}
                      title={
                        l.status === "pending_sale" ? "Cancel pending sale" : "Mark as pending sale"
                      }
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                  {l.status !== "sold" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSoldTarget({ id: l.id, title: l.title })}
                      title="Mark sold"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => undoSold(l.id)}
                      title="Undo sold — restore to active"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => remove(l.id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!soldTarget} onOpenChange={(open) => !open && setSoldTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this item is sold</AlertDialogTitle>
            <AlertDialogDescription>
              {soldTarget ? (
                <>
                  Mark <span className="font-semibold text-foreground">"{soldTarget.title}"</span>{" "}
                  as sold? It will be removed from the active market. You can undo this later if the
                  sale doesn't complete.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkSold}>Yes, mark as sold</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function trendPct(now: number, prev: number): { pct: number; up: boolean } | null {
  if (prev === 0 && now === 0) return null;
  if (prev === 0) return { pct: 100, up: true };
  const diff = ((now - prev) / prev) * 100;
  return { pct: Math.round(Math.abs(diff)), up: diff >= 0 };
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 60,
    h = 18,
    step = w / Math.max(1, values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="text-primary" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
}

function ListingStats({ stats }: { stats?: Stats }) {
  if (!stats) return null;
  const t7 = trendPct(stats.views7, stats.viewsPrev7);
  const t30 = trendPct(stats.views30, stats.viewsPrev30);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs">
      <span className="flex items-center gap-1 font-medium">
        <Heart className="h-3 w-3 text-destructive" />
        {stats.likes} likes
      </span>
      <span className="flex items-center gap-1 font-medium">
        <Bookmark className="h-3 w-3 text-primary" />
        {stats.saves} saves
      </span>
      <span className="flex items-center gap-1 font-medium">
        <MessageSquare className="h-3 w-3" />
        {stats.messages} messages
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Sparkline values={stats.spark} />
        <span>7d</span>
        {t7 ? (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${t7.up ? "text-success" : "text-destructive"}`}
          >
            {t7.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {t7.pct}%
          </span>
        ) : (
          <span>—</span>
        )}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <span>30d</span>
        {t30 ? (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${t30.up ? "text-success" : "text-destructive"}`}
          >
            {t30.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {t30.pct}%
          </span>
        ) : (
          <span>—</span>
        )}
      </span>
    </div>
  );
}
