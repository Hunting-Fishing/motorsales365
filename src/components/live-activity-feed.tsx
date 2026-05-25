import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, TrendingDown, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPHP } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type ActivityItem =
  | {
      kind: "new";
      key: string;
      at: string;
      listingId: string;
      title: string;
      price: number;
      city: string | null;
      region: string | null;
      coverUrl: string | null;
    }
  | {
      kind: "drop";
      key: string;
      at: string;
      listingId: string;
      title: string;
      oldPrice: number;
      newPrice: number;
      deltaPct: number;
      city: string | null;
      region: string | null;
      coverUrl: string | null;
    };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const LISTING_SELECT =
  "id,title,price_php,city,region,listing_media(url,type)";

function pickCover(media: any): string | null {
  const photos = (media ?? []).filter((m: any) => m.type === "photo");
  return photos[0]?.url ?? null;
}

export function LiveActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      const [newRes, dropRes] = await Promise.all([
        supabase
          .from("listings")
          .select(`${LISTING_SELECT},published_at`)
          .in("status", ["active", "pending_sale"])
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(10),
        supabase
          .from("listing_price_history")
          .select(
            `id, changed_at, old_price_php, new_price_php, delta_pct, listings:listing_id(${LISTING_SELECT}, status)`,
          )
          .lt("delta_pct", 0)
          .order("changed_at", { ascending: false })
          .limit(10),
      ]);

      const newItems: ActivityItem[] = (newRes.data ?? []).map((r: any) => ({
        kind: "new",
        key: `new-${r.id}`,
        at: r.published_at,
        listingId: r.id,
        title: r.title,
        price: Number(r.price_php),
        city: r.city,
        region: r.region,
        coverUrl: pickCover(r.listing_media),
      }));

      const dropItems: ActivityItem[] = (dropRes.data ?? [])
        .filter((r: any) => r.listings && ["active", "pending_sale"].includes(r.listings.status))
        .map((r: any) => ({
          kind: "drop",
          key: `drop-${r.id}`,
          at: r.changed_at,
          listingId: r.listings.id,
          title: r.listings.title,
          oldPrice: Number(r.old_price_php),
          newPrice: Number(r.new_price_php),
          deltaPct: Number(r.delta_pct),
          city: r.listings.city,
          region: r.listings.region,
          coverUrl: pickCover(r.listings.listing_media),
        }));

      const merged = [...newItems, ...dropItems]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 12);

      if (mounted) {
        setItems(merged);
        setLoaded(true);
      }
    }

    loadInitial();

    // Realtime channel for new listings + price drops
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        async (payload: any) => {
          const r = payload.new;
          if (!r || !["active", "pending_sale"].includes(r.status) || !r.published_at) return;
          // Fetch media (not in payload)
          const { data: media } = await supabase
            .from("listing_media")
            .select("url, type")
            .eq("listing_id", r.id);
          if (!mounted) return;
          setItems((prev) =>
            [
              {
                kind: "new" as const,
                key: `new-${r.id}-${Date.now()}`,
                at: r.published_at,
                listingId: r.id,
                title: r.title,
                price: Number(r.price_php),
                city: r.city,
                region: r.region,
                coverUrl: pickCover(media),
              },
              ...prev,
            ].slice(0, 12),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listing_price_history" },
        async (payload: any) => {
          const r = payload.new;
          if (!r || Number(r.delta_pct) >= 0) return;
          const { data: listing } = await supabase
            .from("listings")
            .select(`${LISTING_SELECT}, status`)
            .eq("id", r.listing_id)
            .maybeSingle();
          if (!listing || !["active", "pending_sale"].includes((listing as any).status)) return;
          if (!mounted) return;
          setItems((prev) =>
            [
              {
                kind: "drop" as const,
                key: `drop-${r.id}`,
                at: r.changed_at,
                listingId: (listing as any).id,
                title: (listing as any).title,
                oldPrice: Number(r.old_price_php),
                newPrice: Number(r.new_price_php),
                deltaPct: Number(r.delta_pct),
                city: (listing as any).city,
                region: (listing as any).region,
                coverUrl: pickCover((listing as any).listing_media),
              },
              ...prev,
            ].slice(0, 12),
          );
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loaded && items.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">Just listed & price drops</h2>
          <p className="text-muted-foreground">Fresh inventory and lowered prices, updated in real time.</p>
        </div>
      </div>

      {!loaded ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
          Loading activity…
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((it) => (
            <li key={it.key}>
              <Link
                to="/listing/$id"
                params={{ id: it.listingId }}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 sm:p-4"
              >
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted sm:h-16 sm:w-24">
                  {it.coverUrl ? (
                    <img src={it.coverUrl} alt={it.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {it.kind === "new" ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Sparkles className="h-3 w-3" /> Just listed
                      </Badge>
                    ) : (
                      <Badge className="gap-1 bg-success text-success-foreground text-[10px]">
                        <TrendingDown className="h-3 w-3" /> {Math.abs(it.deltaPct).toFixed(0)}% off
                      </Badge>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {timeAgo(it.at)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium">{it.title}</p>
                  <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted-foreground">
                    {it.kind === "new" ? (
                      <span className="text-sm font-semibold text-primary">{formatPHP(it.price)}</span>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-primary">{formatPHP(it.newPrice)}</span>
                        <span className="line-through">{formatPHP(it.oldPrice)}</span>
                      </>
                    )}
                    {(it.city || it.region) && (
                      <span className="truncate">· {[it.city, it.region].filter(Boolean).join(", ")}</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
