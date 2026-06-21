import logoSrc from "@/assets/logo-small.webp";
import { ComingSoonSection } from "@/components/coming-soon";

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
    <ComingSoonSection
      title="Partner parts & accessories"
      subtitle="Curated parts & accessories from partner shops will appear here once supplier onboarding is complete."
    >
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PLACEHOLDER_ITEMS.map((label) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-lg border border-amber-200 bg-white/70 p-2 text-center opacity-60 dark:border-amber-800/60 dark:bg-amber-950/40"
          >
            <img
              src={logoSrc}
              alt="365 MotorSales"
              className="h-8 w-8 object-contain"
              loading="lazy"
            />
            <span className="text-[10px] leading-tight text-amber-900/80 dark:text-amber-200/80">{label}</span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] text-amber-900/70 dark:text-amber-200/70">
        Affiliate links — 365 MotorSales may earn a commission at no extra cost to you.
      </p>
    </ComingSoonSection>
  );
}
