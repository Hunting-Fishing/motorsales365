import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Settings, ListChecks, Users, Flag, CreditCard, ShieldCheck, Gauge, BarChart3, UserCog, Megaphone, QrCode, Ticket, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type Role = "admin" | "sales" | "moderator" | "support" | "advertising";

const NAV: { to: string; label: string; Icon: any; exact?: boolean; roles: Role[] }[] = [
  { to: "/admin", label: "Overview", Icon: Settings, exact: true, roles: ["admin","sales","moderator","support","advertising"] },
  { to: "/admin/accounts", label: "Accounts", Icon: UserCog, roles: ["admin","sales","support"] },
  { to: "/admin/analytics", label: "Analytics", Icon: BarChart3, roles: ["admin","sales","support"] },
  { to: "/admin/advertising", label: "Advertising", Icon: Megaphone, roles: ["admin","advertising"] },
  { to: "/admin/referrals", label: "Staff QR Referrals", Icon: QrCode, roles: ["admin","sales"] },
  { to: "/admin/redemptions", label: "Referral Redemptions", Icon: Ticket, roles: ["admin","sales"] },
  { to: "/admin/pricing", label: "Pricing & plans", Icon: CreditCard, roles: ["admin"] },
  { to: "/admin/performance", label: "Performance", Icon: Gauge, roles: ["admin"] },
  { to: "/admin/listings", label: "Listings", Icon: ListChecks, roles: ["admin","moderator","support"] },
  { to: "/admin/verifications", label: "Verifications", Icon: ShieldCheck, roles: ["admin","moderator"] },
  { to: "/admin/users", label: "Users", Icon: Users, roles: ["admin"] },
  { to: "/admin/reports", label: "Reports", Icon: Flag, roles: ["admin","moderator","support"] },
];

function AdminLayout() {
  const { user, isAdmin, isSales, isModerator, isSupport, isAdvertising, isStaff, loading } = useAuth();
  const navigate = useNavigate();
  const hasAccess = isStaff;
  const myRoles: Role[] = [
    isAdmin && "admin", isSales && "sales", isModerator && "moderator", isSupport && "support", isAdvertising && "advertising",
  ].filter(Boolean) as Role[];

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!hasAccess) navigate({ to: "/dashboard" });
  }, [user, hasAccess, loading, navigate]);

  if (loading || !user || !hasAccess) {
    return <SiteLayout><div className="p-12 text-center text-muted-foreground">Checking access…</div></SiteLayout>;
  }

  const visibleNav = NAV.filter((n) => n.roles.some((r) => myRoles.includes(r)));
  const label = isAdmin ? "Admin" : myRoles[0] ? myRoles[0][0].toUpperCase() + myRoles[0].slice(1) : "Staff";

  return (
    <SiteLayout>
      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:self-start">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
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
