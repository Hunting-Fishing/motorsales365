import logoSrc from "@/assets/logo-small.webp";
import { Badge } from "@/components/ui/badge";

interface Props {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  listingId?: string;
  vehicleId?: string;
}

const PLACEHOLDER_ITEMS = [
  "Brake pads",
  "Tires",
  "Oil filter",
  "Battery",
  "Shocks",
  "Spark plugs",
];

/**
 * Affiliate parts — currently a compact "Coming Soon" teaser.
 * Real partner catalog will be enabled once supplier agreements are in place.
 */
export function AffiliatePartsSection(_props: Props) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          Coming Soon
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Curated parts &amp; accessories from partner shops will appear here once supplier onboarding is complete.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PLACEHOLDER_ITEMS.map((label) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/30 p-2 text-center opacity-60"
          >
            <img
              src={logoSrc}
              alt="365 MotorSales"
              className="h-8 w-8 object-contain"
              loading="lazy"
            />
            <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Affiliate links — 365 MotorSales may earn a commission at no extra cost to you.
      </p>
    </div>
  );
}
