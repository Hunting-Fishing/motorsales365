import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TierBadge } from "@/components/tier-badge";
import { formatDate } from "@/lib/format";
import { getMyTrustScore } from "@/lib/trust-score.functions";
import { getMyTier } from "@/lib/tiers.functions";

export const Route = createFileRoute("/_authenticated/account/trust-score")({
  component: TrustScorePage,
  head: () => ({ meta: [{ title: "My trust score — 365 MotorSales" }] }),
});

function TrustScorePage() {
  const scoreFn = useServerFn(getMyTrustScore);
  const tierFn = useServerFn(getMyTier);
  const [score, setScore] = useState<any>(null);
  const [tier, setTier] = useState<any>(null);

  useEffect(() => {
    Promise.all([scoreFn(), tierFn()])
      .then(([s, t]) => {
        setScore(s);
        setTier(t);
      })
      .catch(() => {});
  }, []);

  if (!score || !tier) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <Skeleton className="h-96 w-full" />
        </div>
      </SiteLayout>
    );
  }

  const currentScore = score.score;
  const currentTier = tier.tier;
  const nextTier = tier.next;
  const pct = nextTier
    ? Math.min(100, Math.max(0, ((currentScore - (currentTier?.min_score ?? 0)) / Math.max(1, nextTier.min_score - (currentTier?.min_score ?? 0))) * 100))
    : 100;

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold">My trust score</h1>
          </div>
          <Link to="/help/trust-score" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <HelpCircle className="h-3 w-3" /> How it works
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current score</div>
              <div className="mt-1 text-5xl font-black text-foreground">{currentScore}<span className="text-base font-normal text-muted-foreground">/1000</span></div>
            </div>
            <TierBadge tierId={tier.tierId} size="md" />
          </div>

          {nextTier && (
            <div className="mt-6">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress to <strong>{nextTier.name}</strong></span>
                <span className="font-mono">{currentScore} / {nextTier.min_score}</span>
              </div>
              <Progress value={pct} />
            </div>
          )}
        </div>

        <h2 className="mt-10 mb-3 font-display text-lg font-bold">Score history</h2>
        {score.events.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No score changes yet. Posting honestly and following our guidelines builds your score over time.
          </p>
        ) : (
          <ul className="space-y-2">
            {score.events.map((e: any) => {
              const positive = e.delta > 0;
              return (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    {positive ? (
                      <TrendingUp className="mt-0.5 h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="mt-0.5 h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{e.reason_label || e.reason_code}</div>
                      <div className="text-[11px] text-muted-foreground">{formatDate(e.created_at)}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={positive ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>
                    {positive ? "+" : ""}{e.delta}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
