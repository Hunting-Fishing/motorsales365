import { Link } from "@tanstack/react-router";
import { BadgePercent, Sparkles } from "lucide-react";
import { useClubDiscountStatus } from "@/hooks/use-club-discount";
import { Badge } from "@/components/ui/badge";

type Variant = "checkout" | "compact" | "banner";

/**
 * Renders a small note about the club-member discount.
 *  - eligible → "Club member 5% off applied"
 *  - not eligible → "Join a verified club to save 5%" with CTA to /clubs
 *  - loading / disabled → nothing
 */
export function ClubDiscountNote({ variant = "checkout" }: { variant?: Variant }) {
  const { data } = useClubDiscountStatus();
  if (!data || !data.enabled) return null;

  if (data.eligible) {
    if (variant === "compact") {
      return (
        <Badge variant="secondary" className="gap-1">
          <BadgePercent className="h-3 w-3" /> Club member {data.pct}% off
        </Badge>
      );
    }
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 text-emerald-600" />
        <div>
          <div className="font-medium text-emerald-700">
            Club member {data.pct}% off applied
          </div>
          {data.clubName ? (
            <div className="text-xs text-muted-foreground">
              Verified member of {data.clubName}. Discount applies to 365 ads, boosts, bundles,
              plans, and Passport Premium.
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Applies to internal 365 purchases only.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        to="/clubs"
        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <BadgePercent className="h-3 w-3" /> Join a verified club — save {data.pct}%
      </Link>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <BadgePercent className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="font-medium">Save {data.pct}% with a verified club</div>
        <div className="text-xs text-muted-foreground">
          Active members of accreditation-verified clubs get {data.pct}% off 365 ads, boosts,
          bundles, plans, and Passport Premium.{" "}
          <Link to="/clubs" className="underline hover:text-foreground">
            Browse clubs
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
