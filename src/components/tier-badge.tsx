import { Crown, Gem, Shield, Sparkles, Star } from "lucide-react";

const META: Record<
  string,
  { label: string; icon: any; classes: string }
> = {
  common: {
    label: "Common",
    icon: Shield,
    classes:
      "border-slate-400/40 bg-slate-400/10 text-slate-700 dark:text-slate-300",
  },
  uncommon: {
    label: "Uncommon",
    icon: Star,
    classes:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  rare: {
    label: "Rare",
    icon: Sparkles,
    classes:
      "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  epic: {
    label: "Epic",
    icon: Gem,
    classes:
      "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  legendary: {
    label: "Legendary",
    icon: Crown,
    classes:
      "border-amber-500/40 bg-gradient-to-r from-amber-400/15 to-yellow-300/15 text-amber-700 dark:text-amber-300 shadow-[0_0_12px_-4px_rgba(245,158,11,0.6)]",
  },
};

export function TierBadge({
  tierId,
  size = "sm",
  showLabel = true,
}: {
  tierId: string | null | undefined;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const meta = META[(tierId || "common").toLowerCase()] ?? META.common;
  const Icon = meta.icon;
  const sizeClass =
    size === "xs"
      ? "h-5 px-1.5 text-[10px] gap-1"
      : size === "md"
        ? "h-7 px-2.5 text-xs gap-1.5"
        : "h-6 px-2 text-[11px] gap-1";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${sizeClass} ${meta.classes}`}
      title={`${meta.label} tier`}
    >
      <Icon className={iconSize} />
      {showLabel && meta.label}
    </span>
  );
}
