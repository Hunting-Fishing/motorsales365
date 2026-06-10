import {
  Phone,
  IdCard,
  FileText,
  ShieldCheck,
  UserCheck,
  ScrollText,
  Eye,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TrustSignals } from "@/lib/trust-signals";

type Tone = "verified" | "declared";

interface BadgeDef {
  key: keyof TrustSignals;
  label: string;
  short: string;
  tooltip: string;
  Icon: LucideIcon;
  tone: Tone;
}

// Order = priority on the card (most trust-bearing first).
const BADGES: BadgeDef[] = [
  {
    key: "idChecked",
    label: "ID Checked",
    short: "ID",
    tooltip: "365 has reviewed the seller's government ID.",
    Icon: IdCard,
    tone: "verified",
  },
  {
    key: "documentsChecked",
    label: "Documents Checked",
    short: "Docs",
    tooltip: "365 has reviewed the OR/CR and supporting documents.",
    Icon: ShieldCheck,
    tone: "verified",
  },
  {
    key: "passport",
    label: "365 Passport",
    short: "Passport",
    tooltip: "This vehicle has a public 365 Passport history page.",
    Icon: BadgeCheck,
    tone: "verified",
  },
  {
    key: "phoneVerified",
    label: "Phone Verified",
    short: "Phone",
    tooltip: "Seller's phone number has been confirmed by OTP.",
    Icon: Phone,
    tone: "verified",
  },
  {
    key: "orCrSubmitted",
    label: "OR/CR Submitted",
    short: "OR/CR",
    tooltip: "Seller has uploaded OR/CR documents (pending 365 review).",
    Icon: FileText,
    tone: "declared",
  },
  {
    key: "registeredOwner",
    label: "Registered Owner",
    short: "Owner",
    tooltip: "Seller states their name matches the CR (seller-declared).",
    Icon: UserCheck,
    tone: "declared",
  },
  {
    key: "deedChainAvailable",
    label: "Deed Chain Available",
    short: "Deeds",
    tooltip: "Seller has a chain of Deed of Sale documents available.",
    Icon: ScrollText,
    tone: "declared",
  },
  {
    key: "inspectionAvailable",
    label: "Inspection Available",
    short: "Inspect",
    tooltip: "Seller allows pre-purchase inspection.",
    Icon: Eye,
    tone: "declared",
  },
];

interface Props {
  signals: TrustSignals;
  size?: "sm" | "md";
  /** Max visible badges before "+N" overflow (sm size only). */
  maxVisible?: number;
  className?: string;
}

export function TrustBadges({ signals, size = "sm", maxVisible = 4, className }: Props) {
  const active = BADGES.filter((b) => signals[b.key]);
  if (active.length === 0) return null;
  const visible = size === "sm" ? active.slice(0, maxVisible) : active;
  const overflow = size === "sm" ? active.length - visible.length : 0;
  const isSm = size === "sm";
  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn("flex flex-wrap items-center gap-1", className)}>
        {visible.map((b) => {
          const verified = b.tone === "verified";
          return (
            <Tooltip key={b.key}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border font-medium leading-none",
                    isSm ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
                    verified
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-secondary text-secondary-foreground",
                  )}
                  aria-label={b.label}
                >
                  <b.Icon className={isSm ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
                  <span>{isSm ? b.short : b.label}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-xs">
                <div className="font-semibold">{b.label}</div>
                <div className="text-muted-foreground">{b.tooltip}</div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border border-border bg-secondary font-medium leading-none text-secondary-foreground",
                  isSm ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
                )}
              >
                +{overflow}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              {active
                .slice(maxVisible)
                .map((b) => b.label)
                .join(" · ")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
