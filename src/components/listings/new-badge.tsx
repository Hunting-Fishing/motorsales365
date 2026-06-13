import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Shows a "NEW" pill when the listing was published in the last 48h. */
export function NewBadge({ publishedAt }: { publishedAt?: string | null }) {
  if (!publishedAt) return null;
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  if (ageMs < 0 || ageMs > 48 * 60 * 60 * 1000) return null;
  return (
    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
      <Sparkles className="mr-1 h-3 w-3" />
      NEW
    </Badge>
  );
}
