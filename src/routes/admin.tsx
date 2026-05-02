import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Settings, ListChecks, Users, Flag, CreditCard, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const NAV: { to: string; label: string; Icon: any; exact?: boolean }[] = [
  { to: "/admin", label: "Overview", Icon: Settings, exact: true },
  { to: "/admin/pricing", label: "Pricing & plans", Icon: CreditCard },
  { to: "/admin/listings", label: "Listings", Icon: ListChecks },
  { to: "/admin/verifications", label: "Verifications", Icon: ShieldCheck },
  { to: "/admin/users", label: "Users", Icon: Users },
  { to: "/admin/reports", label: "Reports", Icon: Flag },
];

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) {
    return <SiteLayout><div className="p-12 text-center text-muted-foreground">Checking access…</div></SiteLayout>;
  }

  return (
    <SiteLayout>
      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:self-start">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</div>
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {NAV.map(({ to, label, Icon, exact }) => (
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
