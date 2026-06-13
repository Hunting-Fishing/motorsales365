import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PriceTrend } from "@/components/listings/price-trend-badge";

export function useListingPriceTrend(listingId: string | undefined | null) {
  return useQuery({
    queryKey: ["listing-price-trend", listingId],
    enabled: !!listingId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PriceTrend | null> => {
      if (!listingId) return null;
      const { data } = await (supabase as any).rpc("get_listing_price_trend", {
        _listing_id: listingId,
      });
      const row = Array.isArray(data) && data.length ? data[0] : null;
      if (!row) return null;
      return {
        direction: row.direction,
        delta_pct: row.delta_pct,
        field: row.field,
        changed_at: row.changed_at,
      };
    },
  });
}

export interface PriceHistoryEntry {
  field: string;
  old_price_php: number;
  new_price_php: number;
  delta_php: number;
  delta_pct: number;
  direction: "up" | "down";
  changed_at: string;
}

export function useListingPriceHistory(listingId: string | undefined | null) {
  return useQuery({
    queryKey: ["listing-price-history", listingId],
    enabled: !!listingId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PriceHistoryEntry[]> => {
      if (!listingId) return [];
      const { data } = await (supabase as any).rpc("get_listing_price_history", {
        _listing_id: listingId,
      });
      return (data ?? []) as PriceHistoryEntry[];
    },
  });
}
