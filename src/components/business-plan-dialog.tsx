import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { listBusinessPlansForType } from "@/lib/business-subscriptions.functions";
import { getMultiBusinessDiscount } from "@/lib/multi-business-discount.functions";
import { applyDiscount } from "@/lib/multi-business-discount";
import { toast } from "sonner";

type Plan = {
  slug: string;
  tier: "listed" | "featured" | "premium";
  interval: "month" | "year";
  price_php: number;
  description: string | null;
  sort_order: number;
};

const TIER_COPY: Record<string, { title: string; blurb: string; perks: string[] }> = {
  listed: {
    title: "Listed",
    blurb: "Get listed in the directory with full contact details and photos.",
    perks: ["Verified directory placement", "Photos, hours, contact info", "Customer reviews"],
  },
  featured: {
    title: "Featured",
    blurb: "Sit at the top of your category and on city pages.",
    perks: [
      "Everything in Listed",
      "Top of category & city pages",
      '"Featured" badge on every card',
      "Higher search rank",
    ],
  },
  premium: {
    title: "Premium",
    blurb: "Maximum reach — homepage rotation plus inquiry leads on every listing.",
    perks: [
      "Everything in Featured",
      "Homepage rotation across vehicle listings",
      "Lead inbox for inquiries",
      "Priority support",
    ],
  },
};

const TIER_ORDER: Array<Plan["tier"]> = ["listed", "featured", "premium"];

interface BusinessPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  typeSlug: string;
  currentTier?: "free" | "listed" | "featured" | "premium" | null;
}

export function BusinessPlanDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
  typeSlug,
  currentTier,
}: BusinessPlanDialogProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [discount, setDiscount] = useState<{ percentOff: number; label: string | null; ordinal: number; totalBusinesses: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      listBusinessPlansForType({ data: { typeSlug } }),
      getMultiBusinessDiscount({ data: { businessId } }).catch(() => null),
    ])
      .then(([planRes, discRes]) => {
        setPlans((planRes.plans ?? []) as Plan[]);
        if (discRes) setDiscount(discRes as any);
      })
      .catch((e) => toast.error(e?.message ?? "Failed to load plans"))
      .finally(() => setLoading(false));
  }, [open, typeSlug, businessId]);

  const tiers = useMemo(() => {
    const map: Record<string, Plan | undefined> = {};
    for (const p of plans) {
      if (p.interval === interval) map[p.tier] = p;
    }
    return map;
  }, [plans, interval]);

  const startCheckout = (plan: Plan) => {
    setBusySlug(plan.slug);
    onOpenChange(false);
    navigate({
      to: "/business/checkout",
      search: { businessId, planSlug: plan.slug },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade {businessName}
          </DialogTitle>
          <DialogDescription>
            Choose a plan to get more visibility and leads for your business directory listing.
          </DialogDescription>
        </DialogHeader>

        {discount && discount.percentOff > 0 && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium text-primary">
                {discount.percentOff}% multi-business discount applied
              </div>
              <div className="text-xs text-muted-foreground">
                This is business #{discount.ordinal + 1} on your account — the discount applies to
                every renewal of this plan.
              </div>
            </div>
          </div>
        )}

        <Tabs value={interval} onValueChange={(v) => setInterval(v as "month" | "year")}>
          <TabsList className="mb-4">
            <TabsTrigger value="month">Monthly</TabsTrigger>
            <TabsTrigger value="year">
              Yearly{" "}
              <Badge variant="secondary" className="ml-2">
                2 months free
              </Badge>
            </TabsTrigger>
          </TabsList>

          {(["month", "year"] as const).map((iv) => (
            <TabsContent key={iv} value={iv}>
              {loading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </div>
              ) : plans.filter((p) => p.interval === iv).length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No plans available for this business type yet. We're adding more — check back
                  soon.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {TIER_ORDER.map((tier) => {
                    const plan = tiers[tier];
                    if (!plan) return null;
                    const isCurrent = currentTier === tier;
                    const copy = TIER_COPY[tier];
                    return (
                      <div
                        key={tier}
                        className={`flex flex-col rounded-xl border p-4 transition ${
                          tier === "featured" ? "border-primary shadow-sm" : "border-border"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-display text-lg font-bold capitalize">
                            {copy.title}
                          </span>
                          {tier === "featured" && (
                            <Badge className="bg-primary">Most popular</Badge>
                          )}
                          {isCurrent && <Badge variant="secondary">Current</Badge>}
                        </div>
                        <div className="mb-2">
                          {discount && discount.percentOff > 0 ? (
                            <>
                              <span className="font-display text-2xl font-extrabold">
                                ₱{applyDiscount(Number(plan.price_php), discount.percentOff).toLocaleString()}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                /{plan.interval === "month" ? "mo" : "yr"}
                              </span>
                              <span className="ml-2 text-xs text-muted-foreground line-through">
                                ₱{Number(plan.price_php).toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-display text-2xl font-extrabold">
                                ₱{Number(plan.price_php).toLocaleString()}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                /{plan.interval === "month" ? "mo" : "yr"}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mb-3 text-xs text-muted-foreground">{copy.blurb}</p>
                        <ul className="mb-4 space-y-1 text-xs">
                          {copy.perks.map((p) => (
                            <li key={p} className="flex items-start gap-1.5">
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                              {p}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="mt-auto"
                          variant={tier === "featured" ? "default" : "outline"}
                          disabled={isCurrent || busySlug !== null}
                          onClick={() => startCheckout(plan)}
                        >
                          {isCurrent
                            ? "Current plan"
                            : busySlug === plan.slug
                              ? "Opening…"
                              : "Choose " + copy.title}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="text-xs text-muted-foreground">
          Cancel anytime. Tier changes take effect at the next billing period.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
