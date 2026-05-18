import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
}

export function AccountTypeCard({ icon: Icon, label, description, selected, onSelect, badge }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col rounded-2xl bg-card p-6 md:p-7 text-left transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-2 border-primary shadow-lg ring-4 ring-primary/5"
          : "border border-border hover:border-primary/40 hover:shadow-xl hover:-translate-y-1",
      )}
    >
      {selected && (
        <Check
          className="absolute top-4 right-4 h-5 w-5 rounded-full bg-primary p-0.5 text-primary-foreground"
          strokeWidth={3}
        />
      )}
      <div
        className={cn(
          "mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300",
          selected
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className={cn("font-display text-base font-bold leading-tight mb-2", selected ? "text-primary" : "text-foreground")}>
        {label}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      {badge && selected && (
        <div className="mt-4">
          <span className="inline-flex items-center rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {badge}
          </span>
        </div>
      )}
    </button>
  );
}
