import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid, Heart, MessageSquare, User as UserIcon, CreditCard, Bookmark, ShieldCheck, Truck, QrCode, Store, Shield, Car, ShoppingBag, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SiteLayout } from "@/components/site-layout";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const NAV: { to: string; label: string; Icon: any; exact?: boolean }[] = [
  { to: "/dashboard", label: "My listings", Icon: LayoutGrid, exact: true },
  { to: "/dashboard/rides", label: "My rides", Icon: Car },
  { to: "/dashboard/favorites", label: "Saved", Icon: Bookmark },
  { to: "/dashboard/shop-favorites", label: "Saved products", Icon: ShoppingBag },
  { to: "/dashboard/likes", label: "Liked", Icon: Heart },
  { to: "/dashboard/searches", label: "Saved searches", Icon: Bookmark },
  { to: "/dashboard/messages", label: "Messages", Icon: MessageSquare },
  { to: "/dashboard/tow", label: "Tow requests", Icon: Truck },
  { to: "/dashboard/businesses", label: "My businesses", Icon: Store },
  { to: "/dashboard/profile", label: "Profile", Icon: UserIcon },
  { to: "/dashboard/verification", label: "Verification", Icon: ShieldCheck },
  { to: "/dashboard/billing", label: "Billing", Icon: CreditCard },
];

function DashboardLayout() {
  const { user, loading, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [hasReferral, setHasReferral] = useState(false);

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
    })();
  }, [user]);

  if (loading || !user) return <SiteLayout><div className="p-12 text-center">Loading…</div></SiteLayout>;

  const nav = [
    ...NAV,
    ...(hasReferral ? [{ to: "/dashboard/referral", label: "My referral", Icon: QrCode }] : []),
    ...(isStaff ? [{ to: "/admin", label: isAdmin ? "Admin" : "Staff console", Icon: Shield }] : []),
  ];

  const needsVerify = !user.email_confirmed_at;

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 pt-4">
        {needsVerify && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-semibold">Verify your email to go live</p>
            <p className="mt-1">
              Your account is created but not yet verified. Publishing listings and being publicly listed are paused until you confirm your email.{" "}
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
        <aside className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card p-2 lg:sticky lg:top-20 lg:self-start">
          <nav className="-mx-1 flex flex-row gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {nav.map(({ to, label, Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: !!exact }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                <Icon className="h-4 w-4" />{label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </SiteLayout>
  );
}
