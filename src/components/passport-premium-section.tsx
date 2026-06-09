import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Crown, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listPassportPremiumProducts } from "@/lib/passport-premium.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/format";

interface Props {
  vehicleId: string;
}

export function PassportPremiumSection({ vehicleId }: Props) {
  const navigate = useNavigate();

  const { data: vehicle } = useQuery({
    queryKey: ["vehicle-premium-status", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("passport_premium, passport_premium_until")
        .eq("id", vehicleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: catalog, isLoading } = useQuery({
    queryKey: ["passport-premium-products"],
    queryFn: () => listPassportPremiumProducts(),
    staleTime: 5 * 60 * 1000,
  });

  const products = catalog?.products ?? [];
  const until = vehicle?.passport_premium_until ? new Date(vehicle.passport_premium_until) : null;
  const isActive = !!until && until.getTime() > Date.now();

  return (
    <section className="rounded-lg border bg-card p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Crown className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Passport Premium
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Stand out to buyers with a featured badge, PDF history report, and branded share card.
          </p>
        </div>
        {isActive && (
          <Badge className="bg-amber-500 text-white">
            <Sparkles className="mr-1 h-3 w-3" /> Active
          </Badge>
        )}
      </header>

      {isActive && until && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Premium is active until <strong>{until.toLocaleDateString()}</strong>. Renew to extend.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Premium plans are coming soon.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <div key={p.slug} className="rounded-md border bg-background p-4">
              <div className="flex items-baseline justify-between">
                <h4 className="font-semibold">{p.label}</h4>
                <span className="text-lg font-bold">{formatPHP(Number(p.price_php))}</span>
              </div>
              {p.description && (
                <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>
              )}
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Featured Verified badge
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> PDF history report
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> Extended record storage
                </li>
              </ul>
              <Button
                className="mt-4 w-full"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/passport-premium/checkout",
                    search: { vehicleId, slug: p.slug },
                  })
                }
              >
                {isActive ? "Renew" : "Upgrade"} — {formatPHP(Number(p.price_php))}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
