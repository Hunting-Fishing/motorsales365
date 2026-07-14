import { Badge } from "@/components/ui/badge";
import type { FeatureStatus } from "@/data/features-catalog";

const STYLES: Record<FeatureStatus, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  beta: { label: "Beta", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  new: { label: "New", className: "bg-primary/15 text-primary border-primary/30" },
  roadmap: { label: "Roadmap", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status }: { status: FeatureStatus }) {
  const s = STYLES[status];
  return (
    <Badge variant="outline" className={s.className}>
      {s.label}
    </Badge>
  );
}
