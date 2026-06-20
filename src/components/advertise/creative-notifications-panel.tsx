import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useUserNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-user-notifications";

function iconFor(category: string) {
  if (category === "ad_creative_approved") return <CircleCheck className="h-4 w-4 text-emerald-500" />;
  if (category === "ad_creative_rejected") return <CircleAlert className="h-4 w-4 text-destructive" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

export function CreativeNotificationsPanel() {
  const { data, isLoading } = useUserNotifications({ limit: 15 });
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          <Bell className="h-4 w-4" />
          Notifications
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            items.map((n: any) => {
              const isUnread = !n.read_at;
              const inner = (
                <div className="flex items-start gap-2 px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div className="pt-0.5">{iconFor(n.category)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug">{n.title}</div>
                    {n.body && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.body}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                  {isUnread && (
                    <button
                      type="button"
                      title="Mark read"
                      className="p-1 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markOne.mutate(n.id);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
              return n.link_url ? (
                <Link
                  key={n.id}
                  to={n.link_url}
                  className={isUnread ? "block bg-primary/5" : "block"}
                  onClick={() => isUnread && markOne.mutate(n.id)}
                >
                  {inner}
                </Link>
              ) : (
                <div key={n.id} className={isUnread ? "bg-primary/5" : ""}>
                  {inner}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
