import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ListingReportPublicNote = {
  category: string | null;
  summary: string;
  made_public_at: string;
  status: string;
};

export type ListingReportSummary = {
  listing_id: string;
  open_count: number;
  resolved_count: number;
  total: number;
  categories: Record<string, number>;
  public_notes: ListingReportPublicNote[];
};

export function useListingReportSummary(listingId: string | undefined) {
  return useQuery({
    queryKey: ["listing-report-summary", listingId],
    enabled: !!listingId,
    staleTime: 60_000,
    queryFn: async (): Promise<ListingReportSummary> => {
      const { data, error } = await supabase.rpc("get_listing_report_summary", {
        _listing_id: listingId!,
      });
      if (error) throw error;
      const d = (data ?? {}) as any;
      return {
        listing_id: listingId!,
        open_count: Number(d.open_count ?? 0),
        resolved_count: Number(d.resolved_count ?? 0),
        total: Number(d.total ?? 0),
        categories: (d.categories ?? {}) as Record<string, number>,
        public_notes: (d.public_notes ?? []) as ListingReportPublicNote[],
      };
    },
  });
}

export type ListingReportCardSummary = {
  listing_id: string;
  open_count: number;
  resolved_count: number;
  total: number;
  has_public_notes: boolean;
};

/** Batch fetch summaries for a feed of listings. */
export function useListingReportSummariesBatch(listingIds: string[]) {
  const key = listingIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["listing-report-summaries", key],
    enabled: listingIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, ListingReportCardSummary>> => {
      const { data, error } = await supabase.rpc("get_listing_report_summaries", {
        _listing_ids: listingIds,
      });
      if (error) throw error;
      const map: Record<string, ListingReportCardSummary> = {};
      for (const row of (data ?? []) as any[]) {
        map[row.listing_id] = {
          listing_id: row.listing_id,
          open_count: Number(row.open_count ?? 0),
          resolved_count: Number(row.resolved_count ?? 0),
          total: Number(row.total ?? 0),
          has_public_notes: !!row.has_public_notes,
        };
      }
      return map;
    },
  });
}
