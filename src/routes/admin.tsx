import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Info, Shield } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { ADMIN_NAV, type AdminNavItem } from "@/lib/admin-nav";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({
    meta: [
      { title: "Admin — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminLayout() {
  const { user, isAdmin, realIsAdmin, effectiveRoles, hasAnyRole, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Any staff persona (real or simulated by a real admin) may enter the console;
  // the sidebar and per-page checks then narrow what's visible per role.
  const STAFF_ROLES = ["admin", "sales", "sales_junior", "sales_senior", "sales_manager", "moderator", "support", "advertising"] as const;
  const hasAccess = hasAnyRole(STAFF_ROLES);

  // 2FA is optional for @365motorsales.com employees and the super-admin.
  // Only enforce for real admins (persona simulation doesn't grant admin privs).
  const emailLc = (user?.email ?? "").toLowerCase();
  const is365Staff =
    emailLc.endsWith("@365motorsales.com") || emailLc === "jordilwbailey@gmail.com";
  const [mfaState, setMfaState] = useState<"checking" | "ok" | "missing">("checking");
  useEffect(() => {
    if (!user || !realIsAdmin || is365Staff) {
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
      const verified = (data?.totp ?? []).some((f: { status: string }) => f.status === "verified");
      setMfaState(verified ? "ok" : "missing");
    })();
    return () => {
      cancelled = true;
    };
  }, [user, realIsAdmin, is365Staff]);

  const { data: pendingCounts } = useAdminPendingCounts(hasAccess);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
    } else if (!hasAccess) {
      toast.error("Staff access required.");
      navigate({ to: "/dashboard" });
    }
  }, [user, hasAccess, loading, navigate]);

  // Map effective roles → the coarse AdminNavRole buckets used by ADMIN_NAV.
  const navRoles = new Set<string>();
  effectiveRoles.forEach((r) => {
    if (r === "admin") navRoles.add("admin");
    else if (r === "moderator") navRoles.add("moderator");
    else if (r === "support") navRoles.add("support");
    else if (r === "advertising") navRoles.add("advertising");
    else if (r === "sales" || r === "sales_junior" || r === "sales_senior" || r === "sales_manager") {
      navRoles.add("sales");
    }
  });
  const visibleNav = ADMIN_NAV.filter((n) => n.roles.some((r) => navRoles.has(r)));

  // If the current subroute isn't in the visible nav for this persona, kick to /admin.
  useEffect(() => {
    if (loading || !hasAccess) return;
    // Overview (/admin) is always allowed for any staff persona.
    if (pathname === "/admin") return;
    const matched = ADMIN_NAV.find((n) =>
      n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/"),
    );
    if (matched && !matched.roles.some((r) => navRoles.has(r))) {
      toast.error("This section isn't available for the selected persona.");
      navigate({ to: "/admin" });
    }
  }, [pathname, loading, hasAccess, navRoles, navigate]);

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

  const label = isAdmin ? "Admin" : "Staff";


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
            <SidebarNav visibleNav={visibleNav} pendingCounts={pendingCounts} />
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

function SidebarNav({
  visibleNav,
  pendingCounts,
}: {
  visibleNav: AdminNavItem[];
  pendingCounts: any;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Group items by section. Items without a section (Overview) render at top.
  const groups: { section: string | undefined; items: AdminNavItem[] }[] = [];
  visibleNav.forEach((item) => {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else groups.push({ section: item.section, items: [item] });
  });

  const renderLink = (item: AdminNavItem) => {
    const { to, label, Icon, exact, info, external } = item;
    const count = pendingCountForRoute(to, pendingCounts);
    const linkClass =
      "flex flex-1 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary";
    return (
      <div key={to} className="group flex shrink-0 items-center gap-1">
        {external ? (
          <a href={to} className={linkClass}>
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
          </a>
        ) : (
          <Link
            to={to}
            activeOptions={{ exact: !!exact }}
            activeProps={{ className: "bg-primary text-primary-foreground" }}
            className={linkClass}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {count > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold leading-none text-destructive-foreground">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        )}
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
    );
  };

  return (
    <nav className="flex flex-col gap-1">
      {groups.map((g, idx) => {
        if (!g.section) {
          return (
            <div key={`top-${idx}`} className="flex flex-col gap-1">
              {g.items.map(renderLink)}
            </div>
          );
        }
        const hasActive = g.items.some((i) =>
          i.exact ? pathname === i.to : pathname.startsWith(i.to),
        );
        return (
          <Collapsible key={g.section} defaultOpen={hasActive} className="mt-2">
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hover:bg-secondary hover:text-foreground">
              <span>{g.section}</span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]:-rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 flex flex-col gap-1">
              {g.items.map(renderLink)}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );
}
