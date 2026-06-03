/**
 * Payment rails surface (Phase 3.3).
 *
 * Renders the list of payment rails for a checkout. Each rail's enabled state
 * comes from `feature_flags.payments.<id>`. Disabled rails are shown with a
 * "Coming soon" pill when `showComingSoon` is true. The current Stripe flow
 * is unchanged — this component is purely presentational discovery.
 */
import { CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { PAYMENT_RAILS, flagKeyForRail, type PaymentProvider } from "@/lib/payments/provider";
import { cn } from "@/lib/utils";

interface PaymentRailsProps {
  selected?: PaymentProvider;
  onSelect?: (provider: PaymentProvider) => void;
  showComingSoon?: boolean;
  className?: string;
}

export function PaymentRails({
  selected,
  onSelect,
  showComingSoon = false,
  className,
}: PaymentRailsProps) {
  const { data: flags } = useFeatureFlags();
  const enabledMap = new Map((flags ?? []).map((f) => [f.key, f.enabled]));

  const rails = PAYMENT_RAILS.filter((rail) => {
    const enabled = enabledMap.get(flagKeyForRail(rail.id)) ?? rail.defaultEnabled;
    return enabled || showComingSoon;
  });

  if (rails.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)} role="radiogroup" aria-label="Payment method">
      {rails.map((rail) => {
        const enabled = enabledMap.get(flagKeyForRail(rail.id)) ?? rail.defaultEnabled;
        const isSelected = selected === rail.id;
        const clickable = enabled && Boolean(onSelect);
        return (
          <Card
            key={rail.id}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={!enabled}
            tabIndex={clickable ? 0 : -1}
            onClick={() => clickable && onSelect?.(rail.id)}
            onKeyDown={(e) => {
              if (!clickable) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(rail.id);
              }
            }}
            className={cn(
              "flex items-center justify-between gap-3 p-4 transition-colors",
              clickable && "cursor-pointer hover:bg-secondary/50",
              isSelected && "border-primary ring-1 ring-primary",
              !enabled && "opacity-60",
            )}
          >
            <div className="flex items-center gap-3">
              {enabled ? (
                <CheckCircle2
                  className={cn("size-4", isSelected ? "text-primary" : "text-muted-foreground")}
                  aria-hidden="true"
                />
              ) : (
                <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{rail.label}</span>
                <span className="text-xs text-muted-foreground">
                  {rail.region === "global" ? "Worldwide" : rail.region.toUpperCase()}
                </span>
              </div>
            </div>
            {!enabled && (
              <Badge variant="secondary" className="text-xs">
                Coming soon
              </Badge>
            )}
          </Card>
        );
      })}
    </div>
  );
}
