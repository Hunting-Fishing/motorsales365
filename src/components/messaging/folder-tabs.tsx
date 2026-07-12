import { Archive, Inbox, Mail, Star, ShieldAlert, ShoppingBag, Tag, CheckCircle2 } from "lucide-react";

export type FolderKey =
  | "all"
  | "unread"
  | "buying"
  | "selling"
  | "sold"
  | "starred"
  | "archived"
  | "spam";

export const FOLDER_ORDER: FolderKey[] = [
  "all",
  "unread",
  "buying",
  "selling",
  "sold",
  "starred",
  "archived",
  "spam",
];

const META: Record<FolderKey, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  all: { label: "All", icon: Inbox },
  unread: { label: "Unread", icon: Mail },
  buying: { label: "Buying", icon: ShoppingBag },
  selling: { label: "Selling", icon: Tag },
  sold: { label: "Sold", icon: CheckCircle2 },
  starred: { label: "Starred", icon: Star },
  archived: { label: "Archived", icon: Archive },
  spam: { label: "Spam", icon: ShieldAlert },
};

interface Props {
  active: FolderKey;
  counts: Record<FolderKey, number>;
  onChange: (f: FolderKey) => void;
}

export function FolderTabs({ active, counts, onChange }: Props) {
  return (
    <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
      {FOLDER_ORDER.map((f) => {
        const { label, icon: Icon } = META[f];
        const isActive = active === f;
        const count = counts[f] ?? 0;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            {count > 0 && (
              <span
                className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
