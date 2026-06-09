import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

const NAV: {
  to: string;
  label: string;
  Icon: any;
  exact?: boolean;
  roles: Role[];
  info: string;
}[] = [
  {
    to: "/admin",
    label: "Overview",
    Icon: Settings,
    exact: true,
    roles: ["admin", "sales", "moderator", "support", "advertising"],
    info: "Snapshot of platform health, KPIs and quick links.",
  },
  {
    to: "/admin/accounts",
    label: "Accounts",
    Icon: UserCog,
    roles: ["admin", "sales", "support"],
    info: "Manage existing customer & business subscriptions: plans, discounts, pause/ban, lifetime spend.",
  },
  {
    to: "/admin/analytics",
    label: "Analytics",
    Icon: BarChart3,
    roles: ["admin", "sales", "support"],
    info: "Traffic, listings, conversions and other platform analytics.",
  },
  {
    to: "/admin/advertising",
    label: "Advertising",
    Icon: Megaphone,
    roles: ["admin", "advertising", "sales"],
    info: "Ad inquiries, placements and advertiser CRM. Senior/manager sales tiers get full access; junior is read-only.",
  },
  {
    to: "/admin/ad-campaigns",
    label: "Ad Campaigns",
    Icon: Megaphone,
    roles: ["admin", "advertising"],
    info: "Create, schedule and manage sponsored ad placements (home carousel, browse banners, category sponsors).",
  },
  {
    to: "/admin/lead-offers",
    label: "Lead Marketplace",
    Icon: Inbox,
    roles: ["admin"],
    info: "Post qualified buyer leads. Featured/Premium businesses pay per unlock to reveal contact info.",
  },
  {
    to: "/admin/promotions",
    label: "Promotions & Discounts",
    Icon: Ticket,
    roles: ["admin", "sales"],
    info: "Site-wide promo codes plus one-off discounts issued to specific customers or businesses. Discounts require manager tier.",
  },
  {
    to: "/admin/shop",
    label: "Affiliate Shop",
    Icon: Store,
    roles: ["admin", "advertising", "sales"],
    info: "Manage affiliate products, networks (Shopee/Lazada/AliExpress) and click analytics.",
  },
  {
    to: "/admin/education",
    label: "Education",
    Icon: GraduationCap,
    roles: ["admin", "moderator"],
    info: "Create and manage courses, modules, lessons, quizzes and sponsored Partner Training schools.",
  },
  {
    to: "/admin/referrals",
    label: "Referrals",
    Icon: QrCode,
    roles: ["admin", "sales"],
    info: "Staff QR codes and redemption history in one workflow (tabs at top of page).",
  },
  {
    to: "/admin/pricing",
    label: "Pricing & plans",
    Icon: CreditCard,
    roles: ["admin"],
    info: "Subscription plans, listing fees and global pricing settings.",
  },
  {
    to: "/admin/payments",
    label: "Payments Control",
    Icon: CreditCard,
    roles: ["admin"],
    info: "Configure PH payment methods (GCash, Maya, QR Ph, bank transfer, PayPal), review manual payments, and audit all transactions.",
  },
  {
    to: "/admin/currencies",
    label: "Currencies",
    Icon: Globe,
    roles: ["admin"],
    info: "Currency list, FX rates and auto-update settings.",
  },
  {
    to: "/admin/performance",
    label: "Performance",
    Icon: Gauge,
    roles: ["admin"],
    info: "Performance flags and image/CDN tuning.",
  },
  {
    to: "/admin/listings",
    label: "Listings",
    Icon: ListChecks,
    roles: ["admin", "moderator", "support"],
    info: "Moderate vehicle/service listings: approve, hide, edit.",
  },
  {
    to: "/admin/businesses",
    label: "Businesses",
    Icon: Store,
    roles: ["admin", "moderator"],
    info: "Approve and moderate the Business directory.",
  },
  {
    to: "/admin/discover-businesses",
    label: "Discover Businesses",
    Icon: Store,
    roles: ["admin", "moderator"],
    info: "One place to find businesses on Google and Facebook, run the hourly auto-sync, verify addresses on the map, and import the ones you want.",
  },
  {
    to: "/admin/claims",
    label: "Business Claims",
    Icon: ShieldCheck,
    roles: ["admin", "moderator"],
    info: "Review claim requests for seeded businesses.",
  },
  {
    to: "/admin/type-suggestions",
    label: "Type suggestions",
    Icon: Sparkles,
    roles: ["admin"],
    info: "Review user-submitted new business types: approve, merge, or reject.",
  },
  {
    to: "/admin/verifications",
    label: "Verifications",
    Icon: ShieldCheck,
    roles: ["admin", "moderator"],
    info: "Approve or reject business verification requests.",
  },
  {
    to: "/admin/users",
    label: "Users",
    Icon: Users,
    roles: ["admin"],
    info: "Create new users (staff or business) and assign roles. For billing/status use Accounts.",
  },
  {
    to: "/admin/staff-365",
    label: "365 Staff",
    Icon: Shield,
    roles: ["admin"],
    info: "Dedicated management for @365motorsales.com employees: edit profile, reset password, sign-in link, enable/disable.",
  },
  {
    to: "/admin/sales-reps",
    label: "Sales Reps",
    Icon: UserCog,
    roles: ["admin"],
    info: "Manage sales reps, their territories (region/province/city), and which users and businesses each rep owns.",
  },
  {
    to: "/admin/reports",
    label: "Activity",
    Icon: Inbox,
    roles: ["admin", "moderator", "support", "sales"],
    info: "Unified inbox: user-submitted reports, service inquiries, and the admin audit log (tabs at top of page).",
  },
  {
    to: "/admin/alerts",
    label: "Ops Alerts",
    Icon: AlertTriangle,
    roles: ["admin"],
    info: "Backend failures (payment webhooks, email errors, geocoding) captured in-app. Investigate and acknowledge.",
  },
  {
    to: "/admin/location-corrections",
    label: "Location fixes",
    Icon: MapPin,
    roles: ["admin", "moderator"],
    info: "User-submitted map pin corrections. Approve to apply the new lat/lng, or revert an approved change.",
  },
  {
    to: "/admin/sandbox",
    label: "Sandbox",
    Icon: FlaskConical,
    roles: ["admin"],
    info: "Internal sandbox for testing flows without affecting production data.",
  },
  {
    to: "/admin/feature-flags",
    label: "Payment & plan flags",
    Icon: Sparkles,
    roles: ["admin"],
    info: "Server-side toggles for payment rails, boost types, and subscription plans. Distinct from the Sandbox device-level UI flags.",
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
          {/* Mobile: section selector */}
          <div className="lg:hidden">
            <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label} console
            </div>
            <AdminMobileSelect items={visibleNav} />
          </div>

          {/* Desktop: sidebar */}
          <aside className="hidden rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:block lg:self-start">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <nav className="flex flex-col gap-1">
              {visibleNav.map(({ to, label, Icon, exact, info }) => (
                <div key={to} className="group flex shrink-0 items-center gap-1">
                  <Link
                    to={to}
                    activeOptions={{ exact: !!exact }}
                    activeProps={{ className: "bg-primary text-primary-foreground" }}
                    className="flex flex-1 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`About ${label}`}
                        className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      {info}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </nav>
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
