import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Settings,
  ListChecks,
  Users,
  CreditCard,
  ShieldCheck,
  Gauge,
  BarChart3,
  UserCog,
  Megaphone,
  QrCode,
  Ticket,
  Globe,
  FlaskConical,
  Store,
  Sparkles,
  Info,
  Inbox,
  Shield,
  GraduationCap,
  AlertTriangle,
  MapPin,
  Truck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell";
import {
  useAdminPendingCounts,
  pendingCountForRoute,
} from "@/hooks/use-admin-pending-counts";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({
    meta: [
      { title: "Admin — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Role = "admin" | "sales" | "moderator" | "support" | "advertising";

type NavItem = {
  to: string;
  label: string;
  Icon: any;
  exact?: boolean;
  roles: Role[];
  info: string;
  section?: string;
  external?: boolean;
};

const NAV: NavItem[] = [
  {
    to: "/admin",
    label: "Overview",
    Icon: Settings,
    exact: true,
    roles: ["admin", "sales", "moderator", "support", "advertising"],
    info: "Snapshot of platform health, KPIs and quick links.",
  },

  // SALES & ADVERTISING
  {
    to: "/admin/sales",
    label: "Sales Hub",
    Icon: BarChart3,
    exact: true,
    roles: ["admin", "sales", "advertising", "support"],
    info: "Consolidated sales workspace: overview, accounts, ads, promotions, referrals and QR share-kit.",
    section: "Sales & Advertising",
  },
  {
    to: "/admin/accounts",
    label: "Accounts",
    Icon: UserCog,
    roles: ["admin", "sales", "support"],
    info: "Manage customer & business subscriptions: plans, discounts, pause/ban, lifetime spend.",
    section: "Sales & Advertising",
  },
  {
    to: "/admin/analytics",
    label: "Analytics",
    Icon: BarChart3,
    roles: ["admin", "sales", "support"],
    info: "Traffic, listings, conversions and other platform analytics.",
    section: "Sales & Advertising",
  },
  {
    to: "/admin/advertisements",
    label: "Advertisements",
    Icon: Megaphone,
    roles: ["admin", "advertising", "sales"],
    info: "Ad inquiries, sponsored campaigns, promotions, share-kit and history — tabbed workspace.",
    section: "Sales & Advertising",
  },
  {
    to: "/admin/shop",
    label: "Affiliate Shop",
    Icon: Store,
    roles: ["admin", "advertising", "sales"],
    info: "Manage affiliate products, networks and click analytics.",
    section: "Sales & Advertising",
  },
  {
    to: "/admin/referrals",
    label: "Referrals",
    Icon: QrCode,
    roles: ["admin", "sales"],
    info: "Staff QR codes and redemption history.",
    section: "Sales & Advertising",
  },
  {
    to: "/admin/advertisements/share-kit",
    label: "My QR / Share Kit",
    Icon: QrCode,
    roles: ["admin", "sales", "advertising", "support", "moderator"],
    info: "Your personal QR applied to printable templates (arm band, shirt, banners).",
    section: "Sales & Advertising",
  },
  {
    to: "/admin/lead-offers",
    label: "Lead Marketplace",
    Icon: Inbox,
    roles: ["admin"],
    info: "Post qualified buyer leads. Featured/Premium businesses pay per unlock.",
    section: "Sales & Advertising",
  },
  {
    to: "/admin/sales-reps",
    label: "Sales Reps",
    Icon: UserCog,
    roles: ["admin"],
    info: "Manage sales reps, territories and assignments.",
    section: "Sales & Advertising",
  },

  // BUSINESSES
  {
    to: "/admin/businesses",
    label: "Directory",
    Icon: Store,
    roles: ["admin", "moderator"],
    info: "Approve and moderate the Business directory.",
    section: "Businesses",
  },
  {
    to: "/admin/discover-businesses",
    label: "Discover",
    Icon: Store,
    roles: ["admin", "moderator"],
    info: "Find, verify and import businesses from Google & Facebook.",
    section: "Businesses",
  },
  {
    to: "/admin/claims",
    label: "Claims",
    Icon: ShieldCheck,
    roles: ["admin", "moderator"],
    info: "Review claim requests for seeded businesses.",
    section: "Businesses",
  },
  {
    to: "/admin/verifications",
    label: "Verifications",
    Icon: ShieldCheck,
    roles: ["admin", "moderator"],
    info: "Approve or reject business verification requests.",
    section: "Businesses",
  },
  {
    to: "/admin/type-suggestions",
    label: "Type suggestions",
    Icon: Sparkles,
    roles: ["admin"],
    info: "Review user-submitted new business types.",
    section: "Businesses",
  },
  {
    to: "/admin/service-suggestions",
    label: "Service suggestions",
    Icon: Sparkles,
    roles: ["admin"],
    info: "Approve user-submitted services into the shared catalog.",
    section: "Businesses",
  },
  {
    to: "/admin/service-suggestion-audit",
    label: "Service audit log",
    Icon: Sparkles,
    roles: ["admin"],
    info: "History of decisions on service suggestions.",
    section: "Businesses",
  },

  // LISTINGS & MODERATION
  {
    to: "/admin/listings",
    label: "Listings",
    Icon: ListChecks,
    roles: ["admin", "moderator", "support"],
    info: "Moderate vehicle/service listings.",
    section: "Listings & Moderation",
  },
  {
    to: "/admin/reports",
    label: "Activity & Reports",
    Icon: Inbox,
    roles: ["admin", "moderator", "support", "sales"],
    info: "Unified inbox: reports, inquiries, admin audit log.",
    section: "Listings & Moderation",
  },
  {
    to: "/admin/location-corrections",
    label: "Location fixes",
    Icon: MapPin,
    roles: ["admin", "moderator"],
    info: "User-submitted map pin corrections.",
    section: "Listings & Moderation",
  },

  // OPERATIONS
  {
    to: "/admin/parts",
    label: "Parts Fulfillment",
    Icon: Store,
    roles: ["admin"],
    info: "In-house parts: catalog, tire specs, buyer quotes, setup checklist.",
    section: "Operations",
  },
  {
    to: "/admin/dispatch",
    label: "365 Dispatch",
    Icon: Truck,
    roles: ["admin", "support"],
    info: "Dispatch subscriptions, live tow-job queue, provider performance.",
    section: "Operations",
  },
  {
    to: "/admin/education",
    label: "Education",
    Icon: GraduationCap,
    roles: ["admin", "moderator"],
    info: "Courses, modules, lessons, quizzes and Partner Training schools.",
    section: "Operations",
  },

  // PEOPLE
  {
    to: "/admin/users",
    label: "Users",
    Icon: Users,
    roles: ["admin"],
    info: "Create new users (staff or business) and assign roles.",
    section: "People",
  },
  {
    to: "/admin/staff-365",
    label: "365 Staff",
    Icon: Shield,
    roles: ["admin"],
    info: "Manage @365motorsales.com employees.",
    section: "People",
  },

  // PLATFORM
  {
    to: "/admin/pricing",
    label: "Pricing & plans",
    Icon: CreditCard,
    roles: ["admin"],
    info: "Subscription plans, listing fees and global pricing settings.",
    section: "Platform",
  },
  {
    to: "/admin/payments",
    label: "Payments Control",
    Icon: CreditCard,
    roles: ["admin"],
    info: "PH payment methods, manual payments, transaction audit.",
    section: "Platform",
  },
  {
    to: "/admin/currencies",
    label: "Currencies",
    Icon: Globe,
    roles: ["admin"],
    info: "Currency list, FX rates and auto-update settings.",
    section: "Platform",
  },
  {
    to: "/admin/performance",
    label: "Performance",
    Icon: Gauge,
    roles: ["admin"],
    info: "Performance flags and image/CDN tuning.",
    section: "Platform",
  },
  {
    to: "/admin/alerts",
    label: "Ops Alerts",
    Icon: AlertTriangle,
    roles: ["admin"],
    info: "Backend failures captured in-app.",
    section: "Platform",
  },
  {
    to: "/admin/feature-flags",
    label: "Payment & plan flags",
    Icon: Sparkles,
    roles: ["admin"],
    info: "Server-side toggles for payment rails, boost types and plans.",
    section: "Platform",
  },
  {
    to: "/admin/sandbox",
    label: "Sandbox",
    Icon: FlaskConical,
    roles: ["admin"],
    info: "Internal sandbox for testing flows.",
    section: "Platform",
  },
];


function AdminLayout() {
  const { user, isAdmin, isSales, isModerator, isSupport, isAdvertising, isStaff, loading } =
    useAuth();
  const navigate = useNavigate();
  const hasAccess = isStaff;
  const myRoles: Role[] = [
    isAdmin && "admin",
    isSales && "sales",
    isModerator && "moderator",
    isSupport && "support",
    isAdvertising && "advertising",
  ].filter(Boolean) as Role[];

  // 2FA is optional for @365motorsales.com employees and the super-admin.
  // Other admins (external) must still enable TOTP.
  const emailLc = (user?.email ?? "").toLowerCase();
  const is365Staff =
    emailLc.endsWith("@365motorsales.com") || emailLc === "jordilwbailey@gmail.com";
  const [mfaState, setMfaState] = useState<"checking" | "ok" | "missing">("checking");
  useEffect(() => {
    if (!user || !isAdmin || is365Staff) {
      setMfaState("ok");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (error) {
        setMfaState("ok");
        return;
      } // fail-open on transient errors
      const verified = (data?.totp ?? []).some((f: any) => f.status === "verified");
      setMfaState(verified ? "ok" : "missing");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, is365Staff]);

  const { data: pendingCounts } = useAdminPendingCounts(hasAccess);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!hasAccess) navigate({ to: "/dashboard" });
  }, [user, hasAccess, loading, navigate]);

  if (loading || !user || !hasAccess || mfaState === "checking") {
    return (
      <SiteLayout>
        <div className="p-12 text-center text-muted-foreground">Checking access…</div>
      </SiteLayout>
    );
  }

  if (mfaState === "missing") {
    return (
      <SiteLayout>
        <div className="container mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Two-factor authentication required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin accounts must enable an authenticator app (TOTP) before accessing the admin
            console. This protects every customer's data on the platform.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard/profile">Set up 2FA in your profile</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const visibleNav = NAV.filter((n) => n.roles.some((r) => myRoles.includes(r)));
  const label = isAdmin
    ? "Admin"
    : myRoles[0]
      ? myRoles[0][0].toUpperCase() + myRoles[0].slice(1)
      : "Staff";



  return (
    <SiteLayout>
      <TooltipProvider delayDuration={200}>
        <div className="container mx-auto grid gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-8 lg:grid-cols-[240px_1fr]">
          {/* Mobile: section selector + bell */}
          <div className="lg:hidden">
            <div className="mb-1 flex items-center justify-between gap-2 px-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label} console
              </div>
              <AdminNotificationBell enabled={hasAccess} />
            </div>
            <AdminMobileSelect items={visibleNav} />
          </div>

          {/* Desktop: sidebar */}
          <aside className="hidden rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:block lg:self-start">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
              <AdminNotificationBell enabled={hasAccess} />
            </div>
            <SidebarNav
              visibleNav={visibleNav}
              pendingCounts={pendingCounts}
            />

          </aside>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </TooltipProvider>
    </SiteLayout>
  );
}

function AdminMobileSelect({ items }: { items: { to: string; label: string }[] }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = items.find((i) => i.to === pathname)?.to ?? items[0]?.to;
  return (
    <Select value={current} onValueChange={(v) => navigate({ to: v as any })}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Go to section" />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.to} value={i.to}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
