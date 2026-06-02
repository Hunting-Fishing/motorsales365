import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listShopFavoriteProducts } from "@/lib/shop.functions";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopFavoriteButton } from "@/components/shop/shop-favorite-button";

export const Route = createFileRoute("/dashboard/shop-favorites")({
  component: ShopFavoritesPage,
});

function ShopFavoritesPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["shop-fav-products", user?.id],
    queryFn: () => listShopFavoriteProducts(),
    enabled: !!user,
  });
  const products = (data?.products ?? []) as any[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Heart className="h-6 w-6 text-rose-500" fill="currentColor" />
            Saved products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length === 0
              ? "Tap the heart on any product to save it."
              : `${products.length} saved item${products.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/shop">
            <ShoppingBag className="mr-1 h-4 w-4" /> Browse shop
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          Loading saved products…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No saved products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When you find a part or tool you like, tap the heart to save it for later.
          </p>
          <Button asChild className="mt-4">
            <Link to="/shop">Browse the shop</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="group relative">
              <ShopFavoriteButton productId={p.id} className="absolute right-2 top-2 z-10" />
              <Link to="/shop/p/$slug" params={{ slug: p.slug }} className="block">
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
                      {p.price_php ? (
                        <p className="text-sm font-bold">₱{Number(p.price_php).toLocaleString()}</p>
                      ) : (
                        <span />
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
          ))}
        </div>
      )}
    </div>
  );
}
