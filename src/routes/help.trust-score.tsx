import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, TrendingUp, TrendingDown, Scale, Gift } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { TierBadge } from "@/components/tier-badge";

const TITLE = "Trust score & member tiers — 365 MotorSales";
const DESCRIPTION = "How the 365 MotorSales trust score works: how points are earned and lost, how to dispute decisions, and the rewards each member tier unlocks.";
const URL = "https://www.365motorsales.com/help/trust-score";

export const Route = createFileRoute("/help/trust-score")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: TrustScoreHelp,
});

const TIERS = [
  { id: "common", label: "Common", score: 0, perks: "Standard posting limits" },
  { id: "uncommon", label: "Uncommon", score: 600, perks: "1 quarterly boost credit" },
  { id: "rare", label: "Rare", score: 750, perks: "3 quarterly boost credits + featured badge" },
  { id: "epic", label: "Epic", score: 850, perks: "5 quarterly + 5 annual boost credits, priority support" },
  { id: "legendary", label: "Legendary", score: 950, perks: "10 quarterly + 25 annual boosts, eligible for Outstanding Member spotlight" },
];

function TrustScoreHelp() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-12 prose prose-sm dark:prose-invert">
        <div className="not-prose inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Shield className="h-3.5 w-3.5" /> Trust & Safety
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">How your trust score works</h1>
        <p className="text-muted-foreground">
          Every member has a trust score from <strong>0 to 1000</strong>, starting at <strong>500</strong>. Your score reflects how you use 365 MotorSales — honest posting, accurate listings, and respectful interactions raise it; rule-breaking lowers it.
        </p>

        <h2 className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /> What raises your score</h2>
        <ul>
          <li>Listings sold without buyer complaints (+5 each)</li>
          <li>Verified phone, ID, and address (+10 each, one-time)</li>
          <li>Positive seller reviews (+2 per 5-star review)</li>
          <li>Reaching account anniversary milestones (+10 yearly)</li>
          <li>Successful dispute (overturned moderation): full refund of points lost</li>
        </ul>

        <h2 className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-destructive" /> What lowers your score</h2>
        <ul>
          <li>Accepted report against your listing: <strong>−25 pts</strong></li>
          <li>Additional <strong>−10 pts</strong> if listing is hidden, <strong>−30 pts</strong> if deleted</li>
          <li>Repeat offenses within 30 days: 2× multiplier</li>
          <li>Buyer disputes you lose: −15 pts</li>
        </ul>

        <h2 className="flex items-center gap-2"><Scale className="h-5 w-5 text-amber-600" /> Disputing a decision</h2>
        <p>
          If we accept a report against you, you have <strong>14 days</strong> to file a single dispute per report. Provide a calm explanation and any evidence (photos, screenshots, receipts). An admin reviews disputes within 5 business days. If overturned, your listing is restored and all points are refunded.
        </p>
        <p>Visit <Link to="/account/disputes">My disputes</Link> to see the status of any active disputes.</p>

        <h2 className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> Member tiers & rewards</h2>
        <p>Tiers are based on your trust score plus account tenure. Higher tiers unlock free boost credits, badges, and eligibility for annual recognition.</p>
        <div className="not-prose my-4 space-y-2">
          {TIERS.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
              <TierBadge tierId={t.id} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.label} <span className="font-mono text-xs text-muted-foreground">· {t.score}+ pts</span></div>
                <div className="text-xs text-muted-foreground">{t.perks}</div>
              </div>
            </div>
          ))}
        </div>

        <h2>Quarterly & annual bonuses</h2>
        <p>
          At the start of each quarter (Jan, Apr, Jul, Oct), active members in good standing — <strong>zero accepted reports in the period</strong> — receive boost credits based on tier. Once a year, every Legendary member receives a larger annual bonus, and the top 10 are eligible for our <em>Outstanding Member</em> spotlight.
        </p>
        <p className="text-xs text-muted-foreground">
          Reward credits are non-transferable and have no cash value. See our <Link to="/terms">Terms</Link> for full details.
        </p>
      </article>
    </SiteLayout>
  );
}
