import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Heuristic: a listing is "Re-listed after expiry" when it's currently active,
 * was originally published more than 60 days ago (past typical active window),
 * and the seller touched it again within the last 72 hours.
 */
export function isRelistedAfterExpiry(args: {
  status?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}): boolean {
  const { status, publishedAt, updatedAt } = args;
  if (status && status !== "active") return false;
  if (!publishedAt || !updatedAt) return false;
  const now = Date.now();
  const pubMs = new Date(publishedAt).getTime();
  const updMs = new Date(updatedAt).getTime();
  const pubAgeDays = (now - pubMs) / (24 * 60 * 60 * 1000);
  const updAgeHrs = (now - updMs) / (60 * 60 * 1000);
  return pubAgeDays > 60 && updAgeHrs >= 0 && updAgeHrs <= 72;
}

/** Hot-pink "Re-listed" pill for listings brought back after expiry. */
export function RelistedBadge({
  status,
  publishedAt,
  updatedAt,
}: {
  status?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}) {
  if (!isRelistedAfterExpiry({ status, publishedAt, updatedAt })) return null;
  return (
    <Badge className="bg-fuchsia-500 text-white hover:bg-fuchsia-500">
      <RotateCcw className="mr-1 h-3 w-3" />
      Re-listed
    </Badge>
  );
}
