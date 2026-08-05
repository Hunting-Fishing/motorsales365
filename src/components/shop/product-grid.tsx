import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { ShopFavoriteButton } from "@/components/shop/shop-favorite-button";

/** Grid of partner (affiliate) products used across the /parts/partners pages. */
export function ProductGrid({
  products,
  vehicle,
}: {
  products: any[];
  vehicle?: { make: string; model: string; year?: number } | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => {
        const list = p.price_php != null ? Number(p.price_php) : null;
        const deal = p.deal_price_php != null ? Number(p.deal_price_php) : null;
        const hasDrop = deal != null && list != null && deal < list;
        const pctOff = hasDrop ? Math.round((1 - deal / list) * 100) : null;
        const effective = deal ?? list;
        return (
          <div key={p.id} className="group relative">
            <ShopFavoriteButton
              productId={p.id}
              className="absolute right-2 top-2 z-10"
              size="md"
            />
            {hasDrop && (
              <Badge className="absolute left-2 top-2 z-10 bg-green-600 hover:bg-green-700">
                -{pctOff}%
              </Badge>
            )}
            <Link to="/parts/partners/p/$slug" params={{ slug: p.slug }} className="block">
              <Card className="overflow-hidden transition hover:shadow-lg">
                {p.image_url ? (
                  <ImageWithSkeleton
                    src={p.image_url}
                    alt={p.title}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="aspect-square w-full bg-muted" />
                )}
                <CardContent className="p-3">
                  <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">
                    {p.title}
                  </p>
                  {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <div className="flex items-baseline gap-1">
                      {effective != null ? (
                        <p className="text-sm font-bold">₱{effective.toLocaleString()}</p>
                      ) : (
                        <span />
                      )}
                      {hasDrop && (
                        <p className="text-[11px] text-muted-foreground line-through">
                          ₱{list!.toLocaleString()}
                        </p>
                      )}
                    </div>
                    {vehicle && !p.universal_fit && (
                      <Badge variant="secondary" className="text-[10px]">
                        Fits {vehicle.model}
                      </Badge>
                    )}
                    {p.universal_fit && (
                      <Badge variant="outline" className="text-[10px]">
                        Universal
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
