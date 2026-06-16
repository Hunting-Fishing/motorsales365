import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { modulesForKind, type WorkspaceModule } from "@/lib/business-workspace/modules";

type Props = {
  businessId: string;
  businessName: string;
  businessKind: string | null | undefined;
  role: "owner" | "manager" | "dispatcher" | "driver" | "mechanic" | "clerk";
};

export function WorkspaceSidebar({ businessId, businessName, businessKind, role }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const modules = modulesForKind(businessKind).filter((m) => {
    if (!m.roles) return true;
    if (role === "owner") return true;
    return m.roles.includes(role);
  });

  return (
    <aside className="w-full md:w-64 shrink-0 border-r border-border bg-card/40 md:min-h-[calc(100vh-200px)]">
      <div className="p-4 border-b border-border">
        <Link
          to="/dashboard/businesses"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <ChevronLeft className="h-3 w-3" /> All businesses
        </Link>
        <div className="mt-2 font-semibold truncate">{businessName}</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">
          {role}
        </div>
      </div>
      <nav className="p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
        {modules.map((m: WorkspaceModule) => {
          const Icon = m.icon;
          const href = m.path(businessId);
          const active =
            pathname === href ||
            (m.id !== "overview" && pathname.startsWith(href));
          return (
            <Link
              key={m.id}
              to={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground/80",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{m.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
