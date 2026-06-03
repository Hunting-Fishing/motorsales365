import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Rocket, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/format";
import { listBoostProducts } from "@/lib/boosts.functions";

interface Props {
  listingId: string;
  listingTitle?: string;
  /** Optional custom trigger. Defaults to an outline "Boost" button. */
  children?: React.ReactNode;
}

export function BoostDialog({ listingId, listingTitle, children }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["boost-products"],
    queryFn: () => listBoostProducts(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const choose = (slug: string) => {
    setOpen(false);
    navigate({
      to: "/boost/checkout",
      search: { listingId, slug },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm" title="Boost listing" aria-label="Boost this listing">
            <Rocket className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Boost this listing
          </DialogTitle>
          <DialogDescription>
            {listingTitle
              ? `Get more eyes on “${listingTitle}”. Pay once — no subscription required (except Category Sponsor).`
              : "Get more eyes on your listing with a paid boost."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(data?.products ?? []).map((p: any) => (
              <button
                key={p.slug}
                onClick={() => choose(p.slug)}
                className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{p.label}</span>
                  {p.recurring && <Badge variant="secondary">Monthly</Badge>}
                </div>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                <div className="mt-auto flex items-baseline justify-between pt-2">
                  <span className="text-lg font-bold text-primary">
                    {formatPHP(Number(p.price_php))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.recurring
                      ? "per month"
                      : `${p.duration_days} day${p.duration_days === 1 ? "" : "s"}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          Payments are secure via Stripe. Boosts activate automatically once payment clears.
        </p>
      </DialogContent>
    </Dialog>
  );
}
