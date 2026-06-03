import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

const NAV: { to: string; label: string; Icon: any; exact?: boolean }[] = [
  { to: "/dashboard", label: "My listings", Icon: LayoutGrid, exact: true },
  { to: "/dashboard/rides", label: "My rides", Icon: Car },
  { to: "/dashboard/vehicles", label: "Vehicle passport", Icon: ShieldCheck },
  { to: "/dashboard/favorites", label: "Saved", Icon: Bookmark },
  { to: "/dashboard/shop-favorites", label: "Saved products", Icon: ShoppingBag },
  { to: "/dashboard/learning", label: "My learning", Icon: GraduationCap },
  { to: "/dashboard/likes", label: "Liked", Icon: Heart },
  { to: "/dashboard/searches", label: "Saved searches", Icon: Search },
  { to: "/dashboard/messages", label: "Messages", Icon: MessageSquare },
  { to: "/dashboard/tow", label: "Tow requests", Icon: Truck },
  { to: "/dashboard/businesses", label: "My businesses", Icon: Store },
  { to: "/dashboard/profile", label: "Profile", Icon: UserIcon },
  { to: "/my-qr", label: "My QR code", Icon: QrCode },
  { to: "/dashboard/verification", label: "Verification", Icon: ShieldCheck },
  { to: "/dashboard/billing", label: "Billing", Icon: CreditCard },
];

function DashboardLayout() {
  const { user, loading, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [hasReferral, setHasReferral] = useState(false);
  const [hasOrg, setHasOrg] = useState(false);

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

  if (loading || !user)
    return (
      <SiteLayout>
        <div className="p-12 text-center">Loading…</div>
      </SiteLayout>
    );

  const nav = [
    ...NAV,
    ...(hasOrg ? [{ to: "/dashboard/team", label: "Team", Icon: Users }] : []),
    ...(hasReferral
      ? [
          { to: "/dashboard/referral", label: "My referral", Icon: QrCode },
          { to: "/dashboard/share-kit", label: "Share kit", Icon: Share2 },
        ]
      : []),
    ...(isStaff
      ? [{ to: "/admin", label: isAdmin ? "Admin" : "Staff console", Icon: Shield }]
      : []),
  ];

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
        {/* Mobile: dropdown menu */}
        <div className="lg:hidden">
          <MobileNavMenu nav={nav} />
        </div>
        {/* Desktop: sidebar */}
        <aside className="hidden min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:block lg:self-start">
          <nav className="flex flex-col gap-1">
            {nav.map(({ to, label, Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: !!exact }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </SiteLayout>
  );
}

function MobileNavMenu({
  nav,
}: {
  nav: { to: string; label: string; Icon: any; exact?: boolean }[];
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current =
    [...nav]
      .sort((a, b) => b.to.length - a.to.length)
      .find((n) =>
        n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/"),
      ) ?? nav[0];
  const CurrentIcon = current.Icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold shadow-sm active:scale-[0.99]">
        <span className="flex items-center gap-2 min-w-0">
          <CurrentIcon className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate">{current.label}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-[calc(100vw-1.5rem)] max-h-[70vh] overflow-y-auto"
      >
        {nav.map(({ to, label, Icon, exact }) => {
          const isActive = exact
            ? pathname === to
            : pathname === to || pathname.startsWith(to + "/");
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
