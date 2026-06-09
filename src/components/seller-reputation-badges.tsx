import { BadgeCheck, Clock, FileCheck2, Award, Repeat2, Crown, Facebook, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface SellerBadgeInput {
  verification_status?: string | null;
  fb_verified_at?: string | null;
  is_founding_member?: boolean | null;
  seller_rating_avg?: number | null;
  seller_rating_count?: number | null;
  active_listings?: number | null;
  sold_count?: number | null;
  documents_verified_count?: number | null;
  fast_response?: boolean | null;
}

interface Badge {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tip: string;
  tone: string;
}

export function computeSellerBadges(p: SellerBadgeInput): Badge[] {
  const badges: Badge[] = [];
  if (p.verification_status === "verified") {
    badges.push({
      key: "verified",
      label: "365 Verified",
      icon: BadgeCheck,
      tip: "Identity and business documents reviewed by 365 MotorSales.",
      tone: "bg-primary/10 text-primary",
    });
  }
  if (p.fb_verified_at) {
    badges.push({
      key: "fb",
      label: "FB Verified",
      icon: Facebook,
      tip: "Facebook profile verified — links back to a real social presence.",
      tone: "bg-blue-500/10 text-blue-600",
    });
  }
  if ((p.seller_rating_count ?? 0) >= 5 && Number(p.seller_rating_avg ?? 0) >= 4.5) {
    badges.push({
      key: "top",
      label: "Top Rated",
      icon: Star,
      tip: "4.5★ or higher across 5+ verified buyer reviews.",
      tone: "bg-amber-500/15 text-amber-700",
    });
  }
  if ((p.sold_count ?? 0) >= 3 || (p.active_listings ?? 0) >= 5) {
    badges.push({
      key: "repeat",
      label: "Repeat Seller",
      icon: Repeat2,
      tip: "Has posted multiple listings on 365 MotorSales.",
      tone: "bg-emerald-500/10 text-emerald-700",
    });
  }
  if ((p.sold_count ?? 0) >= 1) {
    badges.push({
      key: "completed",
      label: "Verified Transaction",
      icon: FileCheck2,
      tip: "Has completed at least one transaction on the platform.",
      tone: "bg-violet-500/10 text-violet-700",
    });
  }
  if (p.is_founding_member) {
    badges.push({
      key: "founding",
      label: "Founding Member",
      icon: Crown,
      tip: "One of the first sellers to join 365 MotorSales.",
      tone: "bg-yellow-500/15 text-yellow-700",
    });
  }
  return badges;
}

export function SellerReputationBadges({
  profile,
  className,
  size = "md",
}: {
  profile: SellerBadgeInput;
  className?: string;
  size?: "sm" | "md";
}) {
  const badges = computeSellerBadges(profile);
  if (!badges.length) return null;
  const px = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const ic = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <Tooltip key={b.key}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full font-semibold",
                    px,
                    b.tone,
                  )}
                >
                  <Icon className={ic} />
                  {b.label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">{b.tip}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// Re-export stubs for future expansion
export const FUTURE_BADGES = {
  responds_fast: { label: "Responds Fast", icon: Clock, requires: "avg reply < 1h" },
  documents_checked: { label: "Documents Checked", icon: FileCheck2, requires: "OR/CR verified" },
  inspection_completed: { label: "Inspection Completed", icon: Award, requires: "365 inspection partner" },
};
