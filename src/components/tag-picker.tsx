import { useState } from "react";
import { X, Plus } from "lucide-react";
import { TAG_GROUPS, type TagGroup } from "@/data/service-tags";

interface TagPickerProps {
  value: string[];
  onChange: (tags: string[]) => void;
  defaultGroups: string[];
  groups?: TagGroup[];
}

export function TagPicker({ value, onChange, defaultGroups, groups = TAG_GROUPS }: TagPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleGroups = showAll ? groups : groups.filter((g) => defaultGroups.includes(g.key));
  const hiddenCount = groups.length - visibleGroups.length;

  const toggle = (tag: string) => {
    if (value.includes(tag)) onChange(value.filter((t) => t !== tag));
    else onChange([...value, tag]);
  };

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            {value.length} selected
          </div>
          <div className="flex flex-wrap gap-1.5">
            {value.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {visibleGroups.map((g) => (
        <div key={g.key}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {g.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.tags.map((t) => {
              const active = value.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="h-3 w-3" /> Show {hiddenCount} more group{hiddenCount === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}
