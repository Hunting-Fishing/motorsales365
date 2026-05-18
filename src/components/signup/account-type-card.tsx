import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export function AccountTypeCard({ icon: Icon, label, description, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-all",
        "hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
          : "border-border",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-display text-sm font-semibold">{label}</div>
      <div className="text-xs leading-snug text-muted-foreground">{description}</div>
    </button>
  );
}
