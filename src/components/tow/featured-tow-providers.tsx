import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Truck, MapPin, Phone, Star, Crown, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Provider = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  region: string | null;
  rating_avg: number;
  rating_count: number;
  tagline: string | null;
  phone: string | null;
  subscription_tier: string;
  owner_id: string;
};

type Rate = {
  user_id: string;
  flat_base_php: number | null;
  per_km_php: number | null;
  min_php: number | null;
  available_24_7: boolean;
};

interface Props {
  region?: string | null;
  className?: string;
}

/**
 * Featured Tow Provider Spotlight — premium placement on /tow for
 * businesses with type_slug='towing' on Featured or Premium subscription
 * tiers. Renders nothing when no sponsored providers exist.
 */
export function FeaturedTowProviders({ region, className }: Props) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [rates, setRates] = useState<Record<string, Rate>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = (supabase as any)
        .from("businesses")
        .select(
          "id,slug,name,logo_url,cover_url,city,region,rating_avg,rating_count,tagline,phone,subscription_tier,owner_id",
        )
        .eq("status", "active")
        .eq("type_slug", "towing")
        .in("subscription_tier", ["featured", "premium"])
        .order("subscription_tier", { ascending: false })
        .order("rating_avg", { ascending: false })
        .limit(6);
      if (region) q = q.eq("region", region);
      const { data } = await q;
      const list = (data ?? []) as Provider[];
      if (cancelled) return;
      setProviders(list);

      if (list.length > 0) {
        const ownerIds = list.map((p) => p.owner_id);
        const { data: rateRows } = await (supabase as any)
          .from("provider_tow_rates")
          .select("user_id,flat_base_php,per_km_php,min_php,available_24_7")
          .in("user_id", ownerIds);
        if (cancelled) return;
        const map: Record<string, Rate> = {};
        for (const r of (rateRows ?? []) as Rate[]) map[r.user_id] = r;
        setRates(map);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region]);

  if (providers.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Crown className="h-3.5 w-3.5 text-primary" />
        <span>Featured Tow Providers</span>
        <span className="ml-auto text-[10px] normal-case tracking-normal">Sponsored</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => {
          const rate = rates[p.owner_id];
          return (
            <Card
              key={p.id}
              className="overflow-hidden border-2 border-primary/30 ring-1 ring-primary/10 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Truck className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <Badge
                  className={
                    p.subscription_tier === "premium"
                      ? "absolute right-2 top-2 bg-amber-500 text-amber-950 shadow"
                      : "absolute right-2 top-2 bg-primary text-primary-foreground shadow"
                  }
                >
                  {p.subscription_tier === "premium" ? "Premium" : "Featured"}
                </Badge>
                {rate?.available_24_7 && (
                  <Badge variant="secondary" className="absolute left-2 top-2 shadow">
                    <Clock className="mr-1 h-3 w-3" /> 24/7
                  </Badge>
                )}
              </div>

              <div className="space-y-2 p-3">
                <div className="flex items-start gap-3">
                  {p.logo_url && (
                    <div className="-mt-8 h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-background bg-background shadow">
                      <img src={p.logo_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/businesses/$slug"
                      params={{ slug: p.slug }}
                      className="block truncate font-semibold hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.tagline && (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{p.tagline}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {(p.city || p.region) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[p.city, p.region].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {p.rating_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {Number(p.rating_avg).toFixed(1)} ({p.rating_count})
                    </span>
                  )}
                </div>

                {rate && (rate.flat_base_php || rate.per_km_php || rate.min_php) && (
                  <div className="rounded-md bg-muted/60 px-2 py-1 text-xs">
                    {rate.flat_base_php && <>Base ₱{Number(rate.flat_base_php).toLocaleString()}</>}
                    {rate.per_km_php && (
                      <> · ₱{Number(rate.per_km_php).toLocaleString()}/km</>
                    )}
                    {rate.min_php && <> · Min ₱{Number(rate.min_php).toLocaleString()}</>}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm" className="flex-1">
                    <Link
                      to="/businesses/$slug"
                      params={{ slug: p.slug }}
                    >
                      View profile
                    </Link>
                  </Button>
                  {p.phone && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`tel:${p.phone}`} aria-label={`Call ${p.name}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Featured slots are paid placements. Tow providers can upgrade their business
        listing to appear here.
      </p>
    </section>
  );
}
