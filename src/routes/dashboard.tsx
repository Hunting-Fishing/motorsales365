import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  Heart,
  MessageSquare,
  User as UserIcon,
  CreditCard,
  Bookmark,
  Search,
  ShieldCheck,
  Truck,
  QrCode,
  Store,
  Shield,
  Car,
  ShoppingBag,
  ChevronDown,
  Check,
  Users,
  GraduationCap,
  Share2,
  Megaphone,
  Rocket,
  Wrench,
  Inbox,
  Bookmark as SavedIcon,
  Briefcase,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDispatchProvider } from "@/hooks/use-dispatch-provider";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  head: () => ({
    meta: [
      { title: "Dashboard — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type NavItem = { to: string; label: string; Icon: any; exact?: boolean };
type NavHub = { key: string; label: string; Icon: any; items: NavItem[] };

function buildHubs(opts: {
  hasOrg: boolean;
  hasReferral: boolean;
  isDispatchProvider: boolean;
}): NavHub[] {
  const hubs: NavHub[] = [
    {
      key: "garage",
      label: "My Garage",
      Icon: Car,
      items: [
        { to: "/dashboard", label: "My listings", Icon: LayoutGrid, exact: true },
        { to: "/dashboard/rides", label: "My rides", Icon: Car },
        { to: "/dashboard/vehicles", label: "Vehicle passport", Icon: ShieldCheck },
        { to: "/dashboard/wanted", label: "Wanted posts", Icon: Megaphone },
      ],
    },
    {
      key: "saved",
      label: "Saved & Activity",
      Icon: SavedIcon,
      items: [
        { to: "/dashboard/favorites", label: "Saved listings", Icon: Bookmark },
        { to: "/dashboard/shop-favorites", label: "Saved products", Icon: ShoppingBag },
        { to: "/dashboard/searches", label: "Saved searches", Icon: Search },
        { to: "/dashboard/likes", label: "Liked", Icon: Heart },
      ],
    },
    {
      key: "inbox",
      label: "Inbox",
      Icon: Inbox,
      items: [
        { to: "/dashboard/messages", label: "Messages", Icon: MessageSquare },
        { to: "/dashboard/blocked", label: "Blocked users", Icon: Shield },
      ],
    },
    {
      key: "business",
      label: "My Business",
      Icon: Briefcase,
      items: [
        { to: "/dashboard/businesses", label: "Businesses", Icon: Store },
        { to: "/shop-manager", label: "Shop Manager", Icon: Wrench },
        { to: "/dashboard/ads", label: "Ad campaigns", Icon: Megaphone },
        { to: "/dashboard/sponsorships", label: "Sponsorships", Icon: Megaphone },
        ...(opts.hasOrg
          ? [
              { to: "/dashboard/team", label: "Team", Icon: Users },
              { to: "/dashboard/staff", label: "Staff & Access", Icon: Users },
            ]
          : []),
      ],
    },
  ];

  if (opts.hasReferral) {
    hubs.push({
      key: "referral",
      label: "Promote & Earn",
      Icon: Share2,
      items: [
        { to: "/dashboard/referral", label: "My referral & stats", Icon: QrCode },
        { to: "/dashboard/qr-ads", label: "QR Ads", Icon: Share2 },
        { to: "/dashboard/promoter-resources", label: "Promoter resources", Icon: Megaphone },
        { to: "/resources/qr-landing", label: "Preview scanner view", Icon: QrCode },
        { to: "/my-qr", label: "My QR code", Icon: QrCode },
      ],
    });
  }

  if (opts.isDispatchProvider) {
    hubs.push({
      key: "dispatch",
      label: "Dispatch",
      Icon: Truck,
      items: [
        { to: "/dashboard/tow", label: "Tow requests", Icon: Truck },
        { to: "/dashboard/dispatch", label: "365 Dispatch", Icon: Truck, exact: true },
        { to: "/dashboard/dispatch/history", label: "Job history", Icon: Truck },
      ],
    });
  }

  hubs.push({
    key: "account",
    label: "Account",
    Icon: SettingsIcon,
    items: [
      { to: "/dashboard/profile", label: "Profile", Icon: UserIcon },
      { to: "/dashboard/verification", label: "Verification", Icon: ShieldCheck },
      { to: "/dashboard/claim-business", label: "Claim a business", Icon: Store },
      { to: "/dashboard/billing", label: "Billing", Icon: CreditCard },
      { to: "/dashboard/boosts", label: "Boost history", Icon: Rocket },
      { to: "/dashboard/learning", label: "My learning", Icon: GraduationCap },
    ],
  });

  return hubs;
}

function itemMatches(path: string, item: NavItem) {
  return item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
}

function DashboardLayout() {
  const { user, loading, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [hasReferral, setHasReferral] = useState(false);
  const [hasOrg, setHasOrg] = useState(false);
  const { hasProfile: isDispatchProvider } = useDispatchProvider();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("staff_referrals")
        .select("id")
        .or(`staff_user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
        .maybeSingle();
      setHasReferral(Boolean(data));
      const { data: orgs } = await (supabase as any)
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);
      setHasOrg(Boolean(orgs && orgs.length > 0));
    })();
  }, [user]);

  const hubs = useMemo(
    () => buildHubs({ hasOrg, hasReferral, isDispatchProvider }),
    [hasOrg, hasReferral, isDispatchProvider],
  );

  const activeHub = useMemo(
    () => hubs.find((h) => h.items.some((it) => itemMatches(pathname, it))) ?? hubs[0],
    [hubs, pathname],
  );

  if (loading || !user)
    return (
      <SiteLayout>
        <div className="p-12 text-center">Loading…</div>
      </SiteLayout>
    );

  const needsVerify = !user.email_confirmed_at;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 pt-4">
        {needsVerify && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Verify your email to go live</p>
            <p className="mt-1">
              Your account is created but not yet verified. Publishing listings and being publicly
              listed are paused until you confirm your email.{" "}
              <Link
                to="/verify-email"
                search={{ email: user.email ?? undefined, intent: undefined }}
                className="font-medium underline"
              >
                Resend verification
              </Link>
            </p>
          </div>
        )}
      </div>
      <div className="container mx-auto grid w-full max-w-full grid-cols-[minmax(0,1fr)] gap-4 overflow-x-hidden px-3 py-4 sm:gap-6 sm:px-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:overflow-x-visible">
        {/* Mobile: grouped dropdown */}
        <div className="lg:hidden">
          <MobileNavMenu hubs={hubs} pathname={pathname} isStaff={isStaff} isAdmin={isAdmin} />
        </div>
        {/* Desktop: hub sidebar */}
        <aside className="hidden min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:block lg:self-start">
          <nav className="flex flex-col gap-1">
            {hubs.map((hub) => {
              const isActive = hub.key === activeHub?.key;
              const HubIcon = hub.Icon;
              const firstItem = hub.items[0];
              return (
                <Link
                  key={hub.key}
                  to={firstItem.to}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  }`}
                >
                  <HubIcon className="h-4 w-4" />
                  {hub.label}
                </Link>
              );
            })}
            {isAdmin && (
              <>
                <div className="my-1 border-t border-border" />
                <Link
                  to="/admin"
                  activeProps={{ className: "bg-primary text-primary-foreground" }}
                  className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              </>
            )}
          </nav>
        </aside>
        <div className="min-w-0 space-y-4">
          {activeHub && activeHub.items.length > 1 && (
            <HubTabs hub={activeHub} pathname={pathname} />
          )}
          <Outlet />
        </div>
      </div>
    </SiteLayout>
  );
}

function HubTabs({ hub, pathname }: { hub: NavHub; pathname: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-1 overflow-x-auto">
      <div className="flex min-w-max gap-1">
        {hub.items.map((it) => {
          const active = itemMatches(pathname, it);
          const Icon = it.Icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              activeOptions={{ exact: !!it.exact }}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MobileNavMenu({
  hubs,
  pathname,
  isStaff,
  isAdmin,
}: {
  hubs: NavHub[];
  pathname: string;
  isStaff: boolean;
  isAdmin: boolean;
}) {
  const current =
    hubs
      .flatMap((h) => h.items.map((it) => ({ ...it, hub: h.label })))
      .sort((a, b) => b.to.length - a.to.length)
      .find((n) => itemMatches(pathname, n)) ?? { ...hubs[0].items[0], hub: hubs[0].label };
  const CurrentIcon = current.Icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold shadow-sm active:scale-[0.99]">
        <span className="flex items-center gap-2 min-w-0">
          <CurrentIcon className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate">
            <span className="text-muted-foreground font-normal">{current.hub} · </span>
            {current.label}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto"
      >
        {hubs.map((hub, hi) => (
          <div key={hub.key}>
            {hi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <hub.Icon className="h-3.5 w-3.5" />
              {hub.label}
            </DropdownMenuLabel>
            {hub.items.map(({ to, label, Icon, exact }) => {
              const isActive = itemMatches(pathname, { to, label, Icon, exact });
              return (
                <DropdownMenuItem key={to} asChild className="min-h-11">
                  <Link
                    to={to}
                    activeOptions={{ exact: !!exact }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{label}</span>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="min-h-11">
              <Link to="/admin" className="flex w-full items-center gap-3 px-3 py-2.5 text-sm">
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">Admin</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
