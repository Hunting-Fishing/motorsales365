import { BadgePercent, Check, X, ShieldCheck, Sparkles } from "lucide-react";

/**
 * Explainer block for the Club Member Discount (5% off internal 365 purchases).
 * Shown on /clubs and inside the Clubs tab on /rides. Presentation-only —
 * the actual eligibility check lives in `src/lib/club-discount.server.ts`.
 *
 * If the percentage, scope, stacking rules, or eligible items change, update
 * this copy alongside `/terms` and the club-member-discount memory entry.
 */
export function ClubDiscountExplainer({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="club-discount-heading"
      className={`rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          <BadgePercent className="h-3.5 w-3.5" />
          Members-only
        </span>
        <h2
          id="club-discount-heading"
          className="font-display text-xl font-bold text-foreground sm:text-2xl"
        >
          5% Club Member Discount
        </h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Active members of a <span className="font-medium text-foreground">verified</span> club on
        365 MotorSales automatically get 5% off internal 365 purchases at checkout — no coupon code
        needed. Eligibility is re-checked on every purchase and recorded on your receipt.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/30 bg-background/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Check className="h-4 w-4" /> Applies to
          </div>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• Ads &amp; ad orders</li>
            <li>• Listing boosts</li>
            <li>• Listing bundles</li>
            <li>• Subscription plans</li>
            <li>• Passport Premium</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <X className="h-4 w-4" /> Doesn't apply to
          </div>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• Third-party partner parts</li>
            <li>• Insurance quotes</li>
            <li>• Tow provider fees</li>
            <li>• External shops &amp; marketplaces</li>
            <li>• Items sold between members</li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground/80">
            Those aren't 365-controlled, so the 5% can't be honored on them.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Who's eligible
          </div>
          <p className="mt-1 text-muted-foreground">
            Signed-in members of a verified club with active membership. If you leave the club or
            the club loses verified status, the discount stops on future purchases.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> How it applies
          </div>
          <p className="mt-1 text-muted-foreground">
            Automatically at checkout on eligible purchases. You'll see a "Club member 5% off
            applied" note and the eligibility reason is stored on your receipt.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background/60 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BadgePercent className="h-3.5 w-3.5 text-emerald-600" /> Stacking
          </div>
          <p className="mt-1 text-muted-foreground">
            Doesn't stack with other percentage discounts or promo coupons on the same purchase —
            the larger discount wins.
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        More perks (insurance rates, parts discounts, event access) are on the roadmap. The 5%
        Club Member Discount is the only live perk today.
      </p>
    </section>
  );
}
