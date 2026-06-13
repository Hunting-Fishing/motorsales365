import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { getListingWantedCount } from "@/lib/parts-wanted.functions";

export function ListingWantedBadge({ listingId }: { listingId: string }) {
  const fn = useServerFn(getListingWantedCount);
  const { data } = useQuery({
    queryKey: ["listing-wanted-count", listingId],
    queryFn: () => fn({ data: { listing_id: listingId } }),
    staleTime: 60_000,
  });
  const count = data?.count ?? 0;
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      <Users className="h-3 w-3" />
      {count} {count === 1 ? "buyer" : "buyers"} wanted this
    </span>
  );
}
