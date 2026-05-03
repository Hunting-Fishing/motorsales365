import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutGrid, Heart, MessageSquare, User as UserIcon, CreditCard, Bookmark, ShieldCheck, Truck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const NAV: { to: string; label: string; Icon: any; exact?: boolean }[] = [
  { to: "/dashboard", label: "My listings", Icon: LayoutGrid, exact: true },
  { to: "/dashboard/favorites", label: "Favorites", Icon: Heart },
  { to: "/dashboard/searches", label: "Saved searches", Icon: Bookmark },
  { to: "/dashboard/messages", label: "Messages", Icon: MessageSquare },
  { to: "/dashboard/tow", label: "Tow requests", Icon: Truck },
  { to: "/dashboard/profile", label: "Profile", Icon: UserIcon },
  { to: "/dashboard/verification", label: "Verification", Icon: ShieldCheck },
  { to: "/dashboard/billing", label: "Billing", Icon: CreditCard },
];

function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) return <SiteLayout><div className="p-12 text-center">Loading…</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:self-start">
          <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
            {NAV.map(({ to, label, Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: !!exact }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
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
