import { BadgePercent, Check, X, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { ClubDiscountPromotion } from "@/lib/club-discount-promotions.functions";

/**
 * Explainer block for Club Member Discount promotions.
 * Content is admin-editable via /admin/club-discount-promotions and loaded
 * SSR-safely from `listActiveClubDiscountPromotions`.
 *
 * Actual eligibility check at checkout still lives in
 * `src/lib/club-discount.server.ts` (driven by /admin/club-discount).
 */
export function ClubDiscountExplainer({
  className,
  promotions,
}: {
  className?: string;
  promotions: ClubDiscountPromotion[];
}) {
  if (!promotions || promotions.length === 0) {
    return null;
  }
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {promotions.map((p) => (
        <PromotionCard key={p.id} promo={p} />
      ))}
    </div>
  );
}

function PromotionCard({ promo }: { promo: ClubDiscountPromotion }) {
  const headingId = `club-discount-heading-${promo.id}`;
  const pctLabel = formatPct(promo.percent);
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
          <BadgePercent className="h-3.5 w-3.5" />
          Members-only
        </span>
        {pctLabel && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-background/70 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {pctLabel} off
          </span>
        )}
        <h2 id={headingId} className="font-display text-xl font-bold text-foreground sm:text-2xl">
          {promo.headline}
        </h2>
      </div>
      {promo.description && (
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{promo.description}</p>
      )}

      {promo.audiences.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {promo.audiences.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-background/60 px-2 py-0.5 text-xs text-emerald-700"
            >
              <Users className="h-3 w-3" />
              {a}
            </span>
          ))}
        </div>
      )}

      {(promo.applies_to.length > 0 || promo.excludes.length > 0) && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {promo.applies_to.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Check className="h-4 w-4" /> Applies to
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {promo.applies_to.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
          {promo.excludes.length > 0 && (
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <X className="h-4 w-4" /> Doesn't apply to
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {promo.excludes.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(promo.eligibility_notes || promo.how_it_applies || promo.stacking_rules) && (
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          {promo.eligibility_notes && (
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Who's eligible
              </div>
              <p className="mt-1 text-muted-foreground">{promo.eligibility_notes}</p>
            </div>
          )}
          {promo.how_it_applies && (
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> How it applies
              </div>
              <p className="mt-1 text-muted-foreground">{promo.how_it_applies}</p>
            </div>
          )}
          {promo.stacking_rules && (
            <div className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <BadgePercent className="h-3.5 w-3.5 text-emerald-600" /> Stacking
              </div>
              <p className="mt-1 text-muted-foreground">{promo.stacking_rules}</p>
            </div>
          )}
        </div>
      )}

      {promo.footer_note && (
        <p className="mt-4 text-xs text-muted-foreground">{promo.footer_note}</p>
      )}
    </section>
  );
}

function formatPct(n: number): string {
  if (!n || n <= 0) return "";
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(2).replace(/\.?0+$/, "")}%`;
}
