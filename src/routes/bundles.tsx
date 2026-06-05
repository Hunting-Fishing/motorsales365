import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Package, Sparkles, Check } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { listListingBundles, purchaseBundle } from "@/lib/listing-bundles.functions";

export const Route = createFileRoute("/bundles")({
  component: BundlesPage,
  head: () => ({
    meta: [
      { title: "Dealer bundles — 365 Motor Sales" },
      {
        name: "description",
        content:
          "Multi-listing dealer packages: listing credits, boost credits and visibility in one bundle. Save vs. buying individually.",
      },
      { property: "og:title", content: "Dealer bundles — 365 Motor Sales" },
      {
        property: "og:description",
        content: "Pre-priced multi-listing bundles for dealers. Listing credits + boost credits, one purchase.",
      },
    ],
  }),
});

function BundlesPage() {
  const { user } = useAuth();
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await listListingBundles();
        setBundles(res.bundles as any[]);
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load bundles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const buy = async (bundleId: string) => {
    if (!user) {
      toast.error("Please sign in to purchase a bundle.");
      return;
    }
    if (!confirm("Confirm purchase? Credits will be added to your account.")) return;
    setBuying(bundleId);
    try {
      await purchaseBundle({ data: { bundleId } });
      toast.success("Bundle purchased — credits available now.");
    } catch (e: any) {
      toast.error(e.message ?? "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3">
            <Sparkles className="h-3 w-3 mr-1" /> Dealer plans
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center justify-center gap-2">
            <Package className="h-8 w-8" /> Listing bundles
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Multi-listing packages for dealers and active sellers. Bundle listing credits with boost credits and save versus buying individually.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground">Loading bundles…</div>
        ) : bundles.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            No bundles available right now. Check back soon.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {bundles.map((b) => (
              <div key={b.id} className="rounded-2xl border bg-card p-6 flex flex-col">
                <h2 className="text-xl font-bold mb-1">{b.name}</h2>
                {b.description && <p className="text-sm text-muted-foreground mb-4">{b.description}</p>}
                <div className="text-3xl font-bold mb-1">
                  ₱{Number(b.price_php).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mb-5">
                  for {b.duration_days} days
                </div>
                <ul className="space-y-2 text-sm mb-6 flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {b.listing_credits} listing credits
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {b.boost_credits} boost credits
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Valid for {b.duration_days} days
                  </li>
                </ul>
                <Button onClick={() => buy(b.id)} disabled={buying === b.id} className="w-full">
                  {buying === b.id ? "Processing…" : "Buy bundle"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
