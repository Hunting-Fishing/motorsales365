import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Plus, MessageSquare, User as UserIcon } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", Icon: Home, exact: true },
  { to: "/browse/$category", params: { category: "car" }, label: "Browse", Icon: LayoutGrid },
  { to: "/sell", label: "Sell", Icon: Plus, primary: true },
  { to: "/dashboard/messages", label: "Inbox", Icon: MessageSquare },
  { to: "/dashboard", label: "Account", Icon: UserIcon },
] as const;

export function MobileTabBar() {
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
                      ? "inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                      : "inline-flex h-6 w-6 items-center justify-center"
                  }
                  aria-hidden="true"
                >
                  <Icon className={primary ? "h-5 w-5" : "h-5 w-5"} />
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
