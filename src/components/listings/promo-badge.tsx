import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPHP } from "@/lib/format";

export interface ListingPromo {
  label: string;
  percent_off?: number | string | null;
  amount_off_php?: number | string | null;
  ends_at: string;
}

function hoursUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000);
}

export function PromoBadge({ promo }: { promo: ListingPromo | null | undefined }) {
  if (!promo) return null;
  const pct = Number(promo.percent_off ?? 0);
  const amt = Number(promo.amount_off_php ?? 0);
  const off = pct > 0 ? `${pct.toFixed(0)}% OFF` : amt > 0 ? `${formatPHP(amt)} OFF` : promo.label;
  const hrs = hoursUntil(promo.ends_at);
  let suffix = "";
  if (hrs > 0 && hrs < 72) {
    suffix = hrs < 24 ? ` · ends in ${Math.max(1, Math.round(hrs))}h` : ` · ends soon`;
  }
  return (
    <Badge className="bg-orange-500 text-white hover:bg-orange-500">
      <Tag className="mr-1 h-3 w-3" />
      {off}
      {suffix}
    </Badge>
  );
}
