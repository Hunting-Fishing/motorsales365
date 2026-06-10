import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ShopSort = "featured" | "price_asc" | "price_desc" | "popular" | "newest";
export type ShopNetwork = "" | "shopee" | "lazada" | "aliexpress";

const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "popular", label: "Best seller" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
  { value: "newest", label: "Newest" },
];

const NETWORKS: { value: Exclude<ShopNetwork, "">; label: string }[] = [
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "aliexpress", label: "AliExpress" },
];

export function ShopSortBar({
  sort,
  network,
  onSortChange,
  onNetworkChange,
  className,
}: {
  sort: ShopSort;
  network: ShopNetwork;
  onSortChange: (s: ShopSort) => void;
  onNetworkChange: (n: ShopNetwork) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {NETWORKS.map((n) => {
          const active = network === n.value;
          return (
            <Button
              key={n.value}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => onNetworkChange(active ? "" : n.value)}
            >
              {n.label}
            </Button>
          );
        })}
        {network && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => onNetworkChange("")}
          >
            Clear
          </Button>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sort</span>
        <Select value={sort} onValueChange={(v) => onSortChange(v as ShopSort)}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
