import { AffiliateShopRow } from "@/components/parts/affiliate-shop-row";

interface Props {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  listingId?: string;
  vehicleId?: string;
}

/**
 * Affiliate parts section on listing pages.
 * Renders nothing when no affiliate suppliers are active, so listings stay
 * clean until at least one affiliate program is approved & enabled in admin.
 */
export function AffiliatePartsSection({ make, model, year, listingId }: Props) {
  const parts = [year, make, model].filter(Boolean).join(" ").trim() || "auto parts";
  return (
    <AffiliateShopRow
      title="Parts & accessories for this ride"
      query={`${parts} parts`}
      listingId={listingId ?? null}
      make={make ?? null}
      model={model ?? null}
      year={year ?? null}
    />
  );
}
