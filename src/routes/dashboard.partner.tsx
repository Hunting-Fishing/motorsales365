import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Inbox, Users, QrCode, BarChart3, Megaphone, LifeBuoy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/partner")({
  component: PartnerHubLayout,
  head: () => ({
    meta: [
      { title: "Partner Hub — 365 MotorSales" },
      { name: "description", content: "One place for your leads, referrals, QR ads and analytics." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Tab = {
  to:
    | "/dashboard/partner/overview"
    | "/dashboard/partner/inbox"
    | "/dashboard/partner/referrals"
    | "/dashboard/partner/qr-ads"
    | "/dashboard/partner/qr-analytics"
    | "/dashboard/partner/advertisements"
    | "/dashboard/partner/performance"
    | "/dashboard/partner/activity";
  label: string;
  Icon: typeof Inbox;
  show: (r: RoleFlags) => boolean;
};

type RoleFlags = {
  isAdmin: boolean;
  isSales: boolean;
  isAdvertising: boolean;
  isSupport: boolean;
};

const TABS: Tab[] = [
  { to: "/dashboard/partner/overview", label: "Overview", Icon: LayoutDashboard, show: () => true },
  { to: "/dashboard/partner/inbox", label: "Inbox", Icon: Inbox, show: (r) => r.isSales || r.isSupport || r.isAdmin },
  { to: "/dashboard/partner/referrals", label: "Referrals", Icon: Users, show: () => true },
  { to: "/dashboard/partner/qr-ads", label: "QR Ads", Icon: QrCode, show: (r) => r.isSales || r.isAdvertising || r.isAdmin },
  { to: "/dashboard/partner/qr-analytics", label: "QR Analytics", Icon: BarChart3, show: (r) => r.isSales || r.isAdvertising || r.isAdmin },
  { to: "/dashboard/partner/advertisements", label: "Advertisements", Icon: Megaphone, show: (r) => r.isAdvertising || r.isAdmin },
  { to: "/dashboard/partner/performance", label: "Performance", Icon: BarChart3, show: (r) => r.isSales || r.isAdmin },
  { to: "/dashboard/partner/activity", label: "Activity", Icon: LifeBuoy, show: (r) => r.isSupport || r.isAdmin },
];

function PartnerHubLayout() {
  const { isAdmin, isSales, isAdvertising, isSupport } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const visible = TABS.filter((t) => t.show({ isAdmin, isSales, isAdvertising, isSupport }));

  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Partner Hub</h1>
        <p className="text-sm text-muted-foreground">
          Everything you need to grow — leads, referrals, QR ads and analytics in one place.
        </p>
      </header>

      <nav
        className="flex flex-wrap gap-1 rounded-lg border bg-card p-1"
        aria-label="Partner hub sections"
      >
        {visible.map(({ to, label, Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div>
        <Outlet />
      </div>
    </div>
  );
}

// Redirect helper for the index
export function redirectToOverview() {
  throw redirect({ to: "/dashboard/partner/overview" });
}
