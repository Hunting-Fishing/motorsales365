import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Settings, ListChecks, Users, Flag, CreditCard, ShieldCheck, Gauge, BarChart3, UserCog } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const NAV: { to: string; label: string; Icon: any; exact?: boolean; adminOnly?: boolean }[] = [
  { to: "/admin", label: "Overview", Icon: Settings, exact: true },
  { to: "/admin/accounts", label: "Accounts", Icon: UserCog },
  { to: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/admin/pricing", label: "Pricing & plans", Icon: CreditCard, adminOnly: true },
  { to: "/admin/performance", label: "Performance", Icon: Gauge, adminOnly: true },
  { to: "/admin/listings", label: "Listings", Icon: ListChecks },
  { to: "/admin/verifications", label: "Verifications", Icon: ShieldCheck, adminOnly: true },
  { to: "/admin/users", label: "Users", Icon: Users, adminOnly: true },
  { to: "/admin/reports", label: "Reports", Icon: Flag, adminOnly: true },
];

function AdminLayout() {
  const { user, isAdmin, isSales, loading } = useAuth();
  const navigate = useNavigate();
  const hasAccess = isAdmin || isSales;

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!hasAccess) navigate({ to: "/dashboard" });
  }, [user, hasAccess, loading, navigate]);

  if (loading || !user || !hasAccess) {
    return <SiteLayout><div className="p-12 text-center text-muted-foreground">Checking access…</div></SiteLayout>;
  }

  const visibleNav = NAV.filter((n) => isAdmin || !n.adminOnly);

  return (
    <SiteLayout>
      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:self-start">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isAdmin ? "Admin" : "Sales"}
          </div>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {visibleNav.map(({ to, label, Icon, exact }) => (
              <Link key={to} to={to} activeOptions={{ exact: !!exact }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary">
                <Icon className="h-4 w-4" />{label}
              </Link>
            ))}
          </nav>
        </aside>
        <div><Outlet /></div>
      </div>
    </SiteLayout>
  );
}
