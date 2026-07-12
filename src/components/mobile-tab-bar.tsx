import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Plus, MessageSquare, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserNotifications } from "@/hooks/use-user-notifications";

const TABS = [
  { to: "/", label: "Home", Icon: Home, exact: true },
  { to: "/browse/$category", params: { category: "car" }, label: "Browse", Icon: LayoutGrid },
  { to: "/sell", label: "Sell", Icon: Plus, primary: true },
  { to: "/dashboard/messages", label: "Inbox", Icon: MessageSquare },
  { to: "/dashboard", label: "Account", Icon: UserIcon },
] as const;

export function MobileTabBar() {
  const { user, loading } = useAuth();
  const { data: messageNotifications } = useUserNotifications({
    limit: 1,
    category: "messages",
    enabled: !!user && !loading,
  });
  const unreadMessages = messageNotifications?.unreadCount ?? 0;

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {TABS.map((t) => {
          const { to, label, Icon } = t as any;
          const params = (t as any).params;
          const primary = (t as any).primary;
          return (
            <li key={label} className="flex-1">
              <Link
                to={to}
                params={params}
                activeOptions={{ exact: (t as any).exact }}
                activeProps={{ className: "text-primary" }}
                className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span
                  className={
                    primary
                      ? "relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                      : "relative inline-flex h-6 w-6 items-center justify-center"
                  }
                  aria-hidden="true"
                >
                  <Icon className={primary ? "h-5 w-5" : "h-5 w-5"} />
                  {to === "/dashboard/messages" && unreadMessages > 0 && (
                    <span className="absolute -right-2 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                      {unreadMessages > 99 ? "99+" : unreadMessages}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
