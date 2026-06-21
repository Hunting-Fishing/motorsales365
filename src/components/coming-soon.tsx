import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ComingSoonBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function ComingSoonBadge({ className, size = "sm" }: ComingSoonBadgeProps) {
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-200 px-2 py-0.5 font-medium uppercase tracking-wide text-amber-900 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-100",
        textSize,
        className,
      )}
    >
      <AlertTriangle className={iconSize} />
      Coming soon
    </span>
  );
}

interface ComingSoonRowProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  span?: boolean;
}

export function ComingSoonRow({ label, icon: Icon, span }: ComingSoonRowProps) {
  return (
    <div
      title="Coming soon"
      aria-disabled="true"
      className={cn(
        "flex w-full min-w-0 items-center gap-2 rounded-md border border-amber-200 bg-white/70 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100",
        span && "sm:col-span-2",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-snug">
        {label}
      </span>
    </div>
  );
}

interface ComingSoonSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ComingSoonSection({
  title = "Need inspection or insurance for this car?",
  subtitle = "Sweet! These will be Awesome Future Services!",
  children,
  className,
}: ComingSoonSectionProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700/60 dark:bg-amber-950/30",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ComingSoonBadge />
      </div>
      <h3 className="mt-2 font-display text-lg font-semibold text-amber-950 dark:text-amber-100">
        {title}
      </h3>
      <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
