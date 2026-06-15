import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Read-only pill that marks an account as 365 Motorsales internal staff.
 * Visibility is derived from the caller (either the @365motorsales.com email
 * suffix or membership in the staff-id list returned by the admin endpoint).
 */
export function Staff365Badge({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "xs" | "sm";
}) {
  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-0.5 text-[10px] gap-1"
      : "px-2 py-0.5 text-[11px] gap-1";
  const iconClasses = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      title="Internal 365 Motorsales staff account"
      className={cn(
        "inline-flex items-center rounded-full border border-primary/40 bg-primary/10 font-semibold uppercase tracking-wide text-primary",
        sizeClasses,
        className,
      )}
    >
      <ShieldCheck className={iconClasses} aria-hidden />
      365 Staff
    </span>
  );
}

/** Helper: returns true when an email belongs to the internal staff domain. */
export function is365StaffEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith("@365motorsales.com");
}
