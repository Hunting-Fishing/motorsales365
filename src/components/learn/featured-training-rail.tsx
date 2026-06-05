import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Crown, MapPin, ExternalLink } from "lucide-react";
import { listTrainingPartners } from "@/lib/education.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Featured Training Partners rail for /learn — surfaces sponsored partners
 * (tier=featured AND sponsored_until in the future). Renders nothing when
 * there are no active sponsored partners.
 */
export function FeaturedTrainingRail({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["learn", "featured-partners"],
    queryFn: () => listTrainingPartners(),
    staleTime: 5 * 60_000,
  });

  const now = Date.now();
  const featured = (data?.partners ?? []).filter(
    (p: any) =>
      p.tier === "featured" &&
      (!p.sponsored_until || new Date(p.sponsored_until).getTime() > now),
  );

  if (featured.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Crown className="h-3.5 w-3.5 text-primary" />
        <span>Featured Training Schools</span>
        <span className="ml-auto text-[10px] normal-case tracking-normal">Sponsored</span>
        <Link
          to="/partner-training"
          className="text-[10px] font-medium normal-case tracking-normal text-primary hover:underline"
        >
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featured.slice(0, 3).map((p: any) => (
          <a
            key={p.id}
            href={p.website_url}
            target="_blank"
            rel="nofollow sponsored noreferrer"
          >
            <Card className="h-full overflow-hidden border-2 border-primary/30 ring-1 ring-primary/10 transition-all hover:border-primary/50 hover:shadow-lg">
              <div className="flex items-start gap-3 p-4">
                {p.logo_url ? (
                  <img
                    src={p.logo_url}
                    alt={p.name}
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-lg border bg-background object-contain"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <Crown className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold">{p.name}</h3>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </div>
                  {p.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {p.location}
                    </p>
                  )}
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  {Array.isArray(p.specialties) && p.specialties.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.specialties.slice(0, 3).map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </a>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Sponsored placements. 365 MotorSales does not certify partner curricula —
        always verify accreditation.
      </p>
    </section>
  );
}
