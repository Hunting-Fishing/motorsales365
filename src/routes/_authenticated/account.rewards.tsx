import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gift, Rocket, Award, Crown } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge } from "@/components/tier-badge";
import { formatDate } from "@/lib/format";
import { listMyRewards, claimReward } from "@/lib/rewards.functions";
import { getMyTier } from "@/lib/tiers.functions";

export const Route = createFileRoute("/_authenticated/account/rewards")({
  component: RewardsPage,
  head: () => ({ meta: [{ title: "My rewards — 365 MotorSales" }] }),
});

const KIND_ICON: Record<string, any> = {
  boost_credit: Rocket,
  featured_badge: Award,
  spotlight: Crown,
  custom: Gift,
};

function RewardsPage() {
  const rewardsFn = useServerFn(listMyRewards);
  const tierFn = useServerFn(getMyTier);
  const claimFn = useServerFn(claimReward);
  const [data, setData] = useState<any>(null);
  const [tier, setTier] = useState<any>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const refresh = async () => {
    const [r, t] = await Promise.all([rewardsFn(), tierFn()]);
    setData(r);
    setTier(t);
  };

  useEffect(() => {
    refresh().catch(() => {});
  }, []);

  const onClaim = async (id: string) => {
    setClaiming(id);
    try {
      await claimFn({ data: { id } });
      toast.success("Reward claimed");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setClaiming(null);
    }
  };

  if (!data || !tier) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <Skeleton className="h-64 w-full" />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl font-bold">My rewards</h1>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">Tier</div>
            <div className="mt-2"><TierBadge tierId={tier.tierId} size="md" /></div>
            <div className="mt-2 text-xs text-muted-foreground">Score {tier.score}</div>
            <Link to="/account/trust-score" className="mt-2 inline-block text-xs text-primary hover:underline">
              View trust score →
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-primary/[0.02] p-5">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground">Boost credit balance</div>
            <div className="mt-2 text-3xl font-black">{data.boostCreditBalance}</div>
            <p className="mt-1 text-xs text-muted-foreground">Use credits to feature your listings. 1 credit = 1 day of boost.</p>
          </div>
        </div>

        <h2 className="mt-10 mb-3 font-display text-lg font-bold">Reward history</h2>
        {data.rewards.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No rewards yet. Keep posting honestly — quarterly and annual bonuses are awarded to active accounts in good standing.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.rewards.map((r: any) => {
              const Icon = KIND_ICON[r.kind] ?? Gift;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-sm font-semibold capitalize">{r.kind.replace(/_/g, " ")} × {r.amount}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDate(r.created_at)}
                        {r.period ? ` · ${r.period}` : ""}
                        {r.note ? ` · ${r.note}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{r.status}</Badge>
                    {r.status === "granted" && (
                      <Button size="sm" onClick={() => onClaim(r.id)} disabled={claiming === r.id}>
                        {claiming === r.id ? "…" : "Claim"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
