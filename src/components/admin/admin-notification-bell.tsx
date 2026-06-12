import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ADMIN_NOTIFICATION_ITEMS,
  useAdminPendingCounts,
  type AdminPendingCounts,
} from "@/hooks/use-admin-pending-counts";

export function AdminNotificationBell({ enabled }: { enabled: boolean }) {
  const { data } = useAdminPendingCounts(enabled);
  const counts = data;
  const items = ADMIN_NOTIFICATION_ITEMS.map((i) => ({
    ...i,
    count: counts ? Number(counts[i.key] ?? 0) : 0,
  })).filter((i) => i.count > 0);
  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Admin notifications${total ? `: ${total} pending` : ""}`}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-secondary"
        >
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Needs attention</span>
          <span className="text-xs text-muted-foreground">{total} item{total === 1 ? "" : "s"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            You're all caught up.
          </div>
        ) : (
          items.map((i) => (
            <DropdownMenuItem key={i.key + i.to} asChild>
              <Link to={i.to} className="flex w-full items-center justify-between gap-2">
                <span className="truncate">{i.label}</span>
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                  {i.count}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type { AdminPendingCounts };
