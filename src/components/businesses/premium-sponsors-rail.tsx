import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Sponsor = {
  id: string;
  slug: string;
  name: string;
  type_slug: string;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  region: string | null;
  rating_avg: number;
  rating_count: number;
  tagline: string | null;
  price_label: string | null;
};

interface PremiumSponsorsRailProps {
  typeSlug?: string | null;
  region?: string | null;
  className?: string;
}

/**
 * Top-of-directory premium sponsor rail. Surfaces businesses on the
 * highest paid tier with a richer card treatment. Renders nothing when
 * there are no premium businesses matching the filters.
 */
export function PremiumSponsorsRail({ typeSlug, region, className }: PremiumSponsorsRailProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = (supabase as any)
        .from("businesses")
        .select(
          "id,slug,name,type_slug,logo_url,cover_url,city,region,rating_avg,rating_count,tagline,price_label",
        )
        .eq("status", "active")
        .eq("subscription_tier", "premium")
        .order("rating_avg", { ascending: false })
        .limit(6);
      if (typeSlug) q = q.eq("type_slug", typeSlug);
      if (region) q = q.eq("region", region);
      const { data } = await q;
      if (!cancelled) setSponsors(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [typeSlug, region]);

  if (sponsors.length === 0) return null;

  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Crown className="h-3.5 w-3.5 text-primary" />
        <span>Premium Sponsors</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sponsors.map((b) => (
          <Link
            key={b.id}
            to="/businesses/$slug"
            params={{ slug: b.slug }}
            className="group block"
          >
            <Card className="overflow-hidden border-2 border-primary/30 ring-1 ring-primary/10 transition-all hover:border-primary/50 hover:shadow-lg">
              <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
                {b.cover_url ? (
                  <img
                    src={b.cover_url}
                    alt={b.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : b.logo_url ? (
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    loading="lazy"
                    className="h-full w-full object-contain p-6"
                  />
                ) : null}
                <Badge className="absolute right-2 top-2 bg-amber-500 text-amber-950 shadow">
                  Premium
                </Badge>
              </div>
              <div className="flex items-start gap-3 p-3">
                {b.logo_url && (
                  <div className="-mt-8 h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-background bg-background shadow">
                    <img src={b.logo_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{b.name}</h3>
                  {b.tagline && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{b.tagline}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {(b.city || b.region) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {b.city || b.region}
                      </span>
                    )}
                    {b.rating_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {Number(b.rating_avg).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
