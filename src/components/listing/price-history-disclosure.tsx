import { ArrowDown, ArrowUp, History } from "lucide-react";
import { useState } from "react";
import { useListingPriceHistory } from "@/hooks/use-listing-price-trend";
import { formatPHP, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const FIELD_LABEL: Record<string, string> = {
  asking: "Cash price",
  monthly: "Monthly",
  down_payment: "Down payment",
};

export function PriceHistoryDisclosure({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const { data: history } = useListingPriceHistory(listingId);
  if (!history || history.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-border bg-card/50 px-3 py-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between font-medium text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          Price history ({history.length})
        </span>
        <span className="text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {history.map((h, i) => {
            const isDown = h.direction === "down";
            const Icon = isDown ? ArrowDown : ArrowUp;
            const pct = Math.abs(Number(h.delta_pct) || 0);
            return (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {formatDate(h.changed_at)} · {FIELD_LABEL[h.field] ?? h.field}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground line-through">
                    {formatPHP(h.old_price_php)}
                  </span>
                  <span className="font-medium">{formatPHP(h.new_price_php)}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
                      isDown
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {pct.toFixed(0)}%
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
