import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Shows a subtle "Renewed" pill when the listing was bumped in the last 24h
 * but isn't brand new (publishedAt > 48h ago).
 */
export function RenewedBadge({
  updatedAt,
  publishedAt,
}: {
  updatedAt?: string | null;
  publishedAt?: string | null;
}) {
  if (!updatedAt) return null;
  const updatedAgeMs = Date.now() - new Date(updatedAt).getTime();
  if (updatedAgeMs < 0 || updatedAgeMs > 24 * 60 * 60 * 1000) return null;
  if (publishedAt) {
    const pubAge = Date.now() - new Date(publishedAt).getTime();
    if (pubAge < 48 * 60 * 60 * 1000) return null; // NEW takes priority
  }
  return (
    <Badge variant="outline" className="border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300">
      <RefreshCw className="mr-1 h-3 w-3" />
      Renewed
    </Badge>
  );
}
