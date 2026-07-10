import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Menu,
  Plus,
  Heart,
  MessageSquare,
  LogOut,
  Shield,
  User as UserIcon,
  Eye,
  X,
  LogIn,
  UserPlus,
  LifeBuoy,
  Briefcase,
  Users,
  BarChart3,
  Inbox,
  Building2,
  CreditCard,
  
  Megaphone,
  ShieldCheck,
  QrCode,
  ListChecks,
  ChevronDown,
  LayoutDashboard,
  Handshake,
} from "lucide-react";
import { useAuth, type SellerType, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const NAV = [
  { category: "car", label: "Cars" },
  { category: "motorcycle", label: "Motorcycles" },
  { category: "boat", label: "Boats" },
  { category: "airplane", label: "Airplanes" },
  { category: "equipment", label: "Equipment" },
  { category: "towing", label: "Towing" },
] as const;

const BUSINESSES_LINK = { to: "/businesses", label: "Businesses" } as const;
const RIDES_LINK = { to: "/rides", label: "Rides" } as const;
const WANTED_LINK = { to: "/wanted", label: "Wanted" } as const;
const PARTS_WANTED_LINK = { to: "/wanted-parts", label: "Parts wanted" } as const;

const SELLER_VIEW_OPTIONS: { value: SellerType; label: string }[] = [
  { value: "private", label: "Private seller" },
  { value: "dealer", label: "Dealer" },
  { value: "repair_shop", label: "Repair shop" },
  { value: "insurance", label: "Insurance" },
];

const ROLE_SIM_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "sales_junior", label: "Sales · Junior" },
  { value: "sales_senior", label: "Sales · Senior" },
  { value: "sales_manager", label: "Sales · Manager" },
  { value: "moderator", label: "Moderator" },
  { value: "support", label: "Support" },
  { value: "advertising", label: "Advertising" },
  { value: "user", label: "Regular user (no staff)" },
];

export function SiteHeader() {
  const {
    user,
    loading,
    profileName,
    isAdmin,
    isSales,
    isStaff,
    isModerator,
    isSupport,
    isAdvertising,
    signOut,
    authError,
    retryAuth,
    realSellerType,
    effectiveSellerType,
    simulatedSellerType,
    setSimulatedSellerType,
    realIsAdmin,
    effectiveRoles,
    simulatedRoles,
    setSimulatedRoles,
    resetPersona,
    realRoles,
  } = useAuth();

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const personaActive = !!(simulatedRoles && simulatedRoles.length > 0) || !!simulatedSellerType;

  const handleResetPersona = async () => {
    const result = resetPersona();
    // Force every cached query to refetch under the real admin identity so
    // no on-screen data is still scoped to the simulated role.
    await queryClient.invalidateQueries();
    if (result.ok) {
      toast.success("Back to real admin", {
        description: `Effective roles: ${result.realRoles.join(", ") || "admin"} · seller: ${result.realSellerType}`,
      });
    } else {
      toast.error("Persona reset incomplete — please refresh the page.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };


  const { list: myBusinesses, setup: businessSetup } = useMyBusinesses(user?.id);


  return (
    <header className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 w-full max-w-none items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-5">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="365 MotorSales Philippines home"
          >
            <BrandLogo size={36} className="shrink-0 sm:[&]:!h-11 sm:[&]:!w-11" />
            <div className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-lg font-bold tracking-tight">365 MotorSales</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Philippines
              </span>
            </div>
          </Link>

          {user && profileName && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Welcome:{" "}
              {myBusinesses[0] ? (
                <Link
                  to="/dashboard/business/$businessId"
                  params={{ businessId: myBusinesses[0].id }}
                  className="font-medium text-foreground hover:underline"
                >
                  {profileName}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{profileName}</span>
              )}
              {businessSetup.needed && (
                <Link
                  to="/businesses/submit"
                  className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                  title="Finish setting up your business"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Setup pending
                </Link>
              )}
            </span>
          )}

          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-hidden xl:flex">
            {NAV.map((n) => (
              <Link
                key={n.category}
                to="/browse/$category"
                params={{ category: n.category }}
                className="shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to={WANTED_LINK.to}
              className="shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {WANTED_LINK.label}
            </Link>
            <Link
              to={PARTS_WANTED_LINK.to}
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[1700px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {PARTS_WANTED_LINK.label}
            </Link>
            <Link
              to={BUSINESSES_LINK.to}
              className="shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {BUSINESSES_LINK.label}
            </Link>
            <Link
              to={RIDES_LINK.to}
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[1550px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {RIDES_LINK.label}
            </Link>
            <Link
              to="/map"
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[1500px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Map
            </Link>
            <Link
              to="/parts"
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[1400px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Parts
            </Link>
            <Link
              to="/shop"
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[2100px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Shop
            </Link>
            <Link
              to="/learn"
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[2100px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Learn
            </Link>
            <Link
              to="/games"
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[2100px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Games
            </Link>

            <Link
              to="/shop-manager"
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[2100px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Shop Manager
            </Link>
            <Link
              to="/export"
              className="hidden shrink-0 whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground min-[2100px]:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Export
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 bg-background/95 sm:gap-2">
          {/* Help icon — desktop */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex h-9 w-9"
            aria-label="Help & support"
          >
            <Link to="/support">
              <LifeBuoy className="h-4 w-4" />
            </Link>
          </Button>

          {/* Sell CTA — desktop only; mobile uses bottom tab bar */}
          <Button asChild className="hidden sm:inline-flex" variant="default">
            <Link to="/sell">
              <Plus className="mr-1 h-4 w-4" /> Post a listing
            </Link>
          </Button>

          {/* Admin Portal shortcut — visible only to confirmed admins */}
          {user && !loading && isAdmin && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden md:inline-flex gap-1.5"
              title="Admin portal"
            >
              <Link to="/admin">
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            </Button>
          )}


          {user && !loading && realIsAdmin && (() => {
            const activeRolePersona = ROLE_SIM_OPTIONS.find(
              (o) => (simulatedRoles ?? []).includes(o.value),
            );
            const activeSellerPersona = simulatedSellerType
              ? SELLER_VIEW_OPTIONS.find((o) => o.value === simulatedSellerType)
              : null;
            const label = activeRolePersona?.label
              ?? activeSellerPersona?.label
              ?? `${SELLER_VIEW_OPTIONS.find((o) => o.value === effectiveSellerType)?.label ?? effectiveSellerType}`;
            const setSellerPersona = (v: SellerType) => {
              setSimulatedRoles(null);
              setSimulatedSellerType(v === realSellerType ? null : v);
            };
            const setRolePersona = (v: AppRole) => {
              setSimulatedSellerType(null);
              setSimulatedRoles([v]);
            };
            return (
              <div className="hidden md:inline-flex items-center gap-1">
                {personaActive && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleResetPersona}
                    className="gap-1.5"
                    title="Clear persona and refetch all data as real admin"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" title="Preview app as any persona (UI only)">
                      <Eye className="h-4 w-4" />
                      <span className="hidden md:inline">View as: {label}</span>
                    </Button>
                  </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Seller personas
                  </div>
                  {SELLER_VIEW_OPTIONS.map((o) => {
                    const active = !activeRolePersona && effectiveSellerType === o.value;
                    return (
                      <DropdownMenuItem key={`s-${o.value}`} onClick={() => setSellerPersona(o.value)}>
                        {active ? "✓ " : "  "}{o.label}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Role personas
                  </div>
                  {ROLE_SIM_OPTIONS.map((o) => {
                    const active = (simulatedRoles ?? []).includes(o.value) && (simulatedRoles ?? []).length === 1;
                    return (
                      <DropdownMenuItem key={`r-${o.value}`} onClick={() => setRolePersona(o.value)}>
                        {active ? "✓ " : "  "}{o.label}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleResetPersona}>
                    Reset to my real admin account
                  </DropdownMenuItem>
                  <div className="px-2 py-1 text-[10px] text-muted-foreground">
                    Effective roles: {effectiveRoles.join(", ") || "none"}
                    <br />
                    Real roles: {realRoles.join(", ") || "none"}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            );

          })()}

          {authError ? (
            (() => {
              const needsLogin = !user;
              const label = needsLogin
                ? "Please sign in again"
                : authError === "refresh_failed"
                ? "Session expired"
                : authError === "safety_timeout"
                ? "Sign-in stalled"
                : "Sign-in failed";
              return (
                <div
                  className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-destructive"
                  role="alert"
                  aria-live="assertive"
                  data-auth-state={needsLogin ? "needs-login" : "error"}
                >
                  <span className="hidden text-xs font-medium sm:inline">{label}</span>
                  {needsLogin ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const next = encodeURIComponent(
                          window.location.pathname + window.location.search,
                        );
                        navigate({ to: "/auth", search: { next } as any });
                      }}
                    >
                      <LogIn className="mr-1 h-3 w-3" />
                      Sign in
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        void retryAuth();
                      }}
                    >
                      Try again
                    </Button>
                  )}
                </div>
              );
            })()
          ) : loading && user ? (
            <div
              className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-1.5"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
                Signing you in…
              </span>
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:inline-flex gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {(myBusinesses.length > 0 || businessSetup.needed) && (
                  <>
                    <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      My businesses
                    </div>
                    {myBusinesses.map((b) => (
                      <div key={b.id} className="px-1 pb-1">
                        <div className="flex items-center gap-1">
                          <DropdownMenuItem asChild className="flex-1">
                            <Link
                              to="/dashboard/business/$businessId"
                              params={{ businessId: b.id }}
                              className="flex items-center gap-2"
                            >
                              <Building2 className="h-4 w-4 text-primary" />
                              <span className="truncate">{b.name}</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="px-2">
                            <Link
                              to="/dashboard/business/$businessId/billing"
                              params={{ businessId: b.id }}
                              aria-label="Billing & plan"
                              title="Billing & plan"
                            >
                              <CreditCard className="h-4 w-4" />
                            </Link>
                          </DropdownMenuItem>
                        </div>
                      </div>
                    ))}
                    {businessSetup.needed && (
                      <div className="px-1 pb-1">
                        <DropdownMenuItem asChild>
                          <Link
                            to="/businesses/submit"
                            className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-2 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
                          >
                            <Plus className="mt-0.5 h-4 w-4 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold">
                                Finish setting up your
                                {businessSetup.kindLabel
                                  ? ` ${businessSetup.kindLabel.toLowerCase()}`
                                  : ""}{" "}
                                business
                              </div>
                              <div className="truncate text-[11px] opacity-80">
                                {businessSetup.name
                                  ? `Continue with ${businessSetup.name}`
                                  : "Add details to publish your page"}
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      </div>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">My listings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/favorites">
                    <Heart className="mr-2 h-4 w-4" />
                    Favorites
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/messages">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Messages
                  </Link>
                </DropdownMenuItem>
                {isStaff && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      365 Staff · Quick routing
                    </div>
                    {(isSales || isAdvertising || isAdmin) && (
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/partner">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Partner Hub
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {(isModerator || isAdmin) && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/listings">
                            <ListChecks className="mr-2 h-4 w-4" />
                            Moderate listings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/businesses">
                            <Building2 className="mr-2 h-4 w-4" />
                            Business directory
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/verifications">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Verifications
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {(isSupport || isAdmin) && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/reports">
                            <LifeBuoy className="mr-2 h-4 w-4" />
                            Activity &amp; reports
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/qr-leads">
                            <Inbox className="mr-2 h-4 w-4" />
                            QR leads
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/sales-reps">
                            <Users className="mr-2 h-4 w-4" />
                            Manage sales reps
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/franchise">
                            <Handshake className="mr-2 h-4 w-4" />
                            Franchise queue
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin console
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/franchise">
                      <Handshake className="mr-2 h-4 w-4" />
                      Franchise queue
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/franchise/status">
                    <Handshake className="mr-2 h-4 w-4" />
                    Franchise status
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">
                  <LogIn className="mr-1 h-4 w-4" />
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/signup">
                  <UserPlus className="mr-1 h-4 w-4" />
                  Sign up
                </Link>
              </Button>
            </div>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm p-0 flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <BrandLogo size={32} />
                  <span className="font-display text-base font-bold">365 MotorSales</span>
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
                <SheetClose asChild>
                  <Link
                    to="/sell"
                    className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
                  >
                    <Plus className="h-5 w-5" /> Post a listing
                  </Link>
                </SheetClose>

                <details open className="group/sec rounded-lg border overflow-hidden border-sky-300 bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/15 px-2 py-1.5">
                  <summary className="sticky top-0 z-10 -mx-2 -mt-1.5 mb-1 flex cursor-pointer list-none items-center justify-between rounded-t-lg bg-sky-100 dark:bg-sky-500/25 px-3 py-2 text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-200 shadow-sm">Browse<ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/sec:rotate-180" /></summary>
                  <div className="flex flex-col gap-0.5">
                    {NAV.map((n) => (
                      <SheetClose asChild key={n.category}>
                        <Link
                          to="/browse/$category"
                          params={{ category: n.category }}
                          className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                          activeProps={{ className: "bg-background/70 text-foreground" }}
                        >
                          {n.label}
                        </Link>
                      </SheetClose>
                    ))}
                    <SheetClose asChild>
                      <Link
                        to={WANTED_LINK.to}
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                        activeProps={{ className: "bg-background/70 text-foreground" }}
                      >
                        {WANTED_LINK.label}
                      </Link>
                    </SheetClose>
                  </div>
                </details>

                <details open className="group/sec rounded-lg border overflow-hidden border-emerald-300 bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 px-2 py-1.5">
                  <summary className="sticky top-0 z-10 -mx-2 -mt-1.5 mb-1 flex cursor-pointer list-none items-center justify-between rounded-t-lg bg-emerald-100 dark:bg-emerald-500/25 px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200 shadow-sm">Marketplace<ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/sec:rotate-180" /></summary>
                  <div className="flex flex-col gap-0.5">
                    <SheetClose asChild>
                      <Link
                        to={BUSINESSES_LINK.to}
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        {BUSINESSES_LINK.label}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to={RIDES_LINK.to}
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        {RIDES_LINK.label}
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/map"
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        Map
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/parts"
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        Parts
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/shop"
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        Shop
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/shop-manager"
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        Shop Manager
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/games"
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        Games
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/learn"
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        Learn
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/partner-training"
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        Partner training
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/pricing"
                        className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        Pricing
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/support"
                        className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60"
                      >
                        <LifeBuoy className="h-4 w-4" /> Help &amp; Support
                      </Link>
                    </SheetClose>
                  </div>
                </details>


                {user && (
                  <>
                    {(myBusinesses.length > 0 || businessSetup.needed) && (
                      <details open className="group/sec rounded-lg border overflow-hidden border-amber-300 bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/15 px-2 py-1.5">
                        <summary className="sticky top-0 z-10 -mx-2 -mt-1.5 mb-1 flex cursor-pointer list-none items-center justify-between rounded-t-lg bg-amber-100 dark:bg-amber-500/25 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200 shadow-sm">My businesses<ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/sec:rotate-180" /></summary>
                        <div className="flex flex-col gap-0.5">
                          {myBusinesses.map((b) => (
                            <div key={b.id} className="flex items-center gap-1 px-1">
                              <SheetClose asChild>
                                <Link
                                  to="/dashboard/business/$businessId"
                                  params={{ businessId: b.id }}
                                  className="flex-1 flex items-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium hover:bg-background/60"
                                >
                                  <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  <span className="truncate">{b.name}</span>
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/dashboard/business/$businessId/billing"
                                  params={{ businessId: b.id }}
                                  aria-label="Billing & plan"
                                  className="rounded-md p-2 hover:bg-background/60"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Link>
                              </SheetClose>
                            </div>
                          ))}
                          {businessSetup.needed && (
                            <div className="px-1">
                              <SheetClose asChild>
                                <Link
                                  to="/businesses/submit"
                                  className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/20 px-3 py-3 text-sm font-medium text-amber-800 hover:bg-amber-500/30 dark:text-amber-200"
                                >
                                  <Plus className="mt-0.5 h-4 w-4 shrink-0" />
                                  <span className="min-w-0">
                                    Finish setting up your
                                    {businessSetup.kindLabel
                                      ? ` ${businessSetup.kindLabel.toLowerCase()}`
                                      : ""}{" "}
                                    business
                                  </span>
                                </Link>
                              </SheetClose>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                    <details open className="group/sec rounded-lg border overflow-hidden border-violet-300 bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/15 px-2 py-1.5">
                      <summary className="sticky top-0 z-10 -mx-2 -mt-1.5 mb-1 flex cursor-pointer list-none items-center justify-between rounded-t-lg bg-violet-100 dark:bg-violet-500/25 px-3 py-2 text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-200 shadow-sm">Account<ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/sec:rotate-180" /></summary>
                      <div className="flex flex-col gap-0.5">
                        <SheetClose asChild>
                          <Link to="/dashboard" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60">
                            My listings
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to="/dashboard/favorites" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60">
                            Favorites
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to="/dashboard/messages" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60">
                            Messages
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to="/dashboard/billing" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60">
                            Billing
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to="/dashboard/profile" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-background/60">
                            Profile
                          </Link>
                        </SheetClose>
                      </div>
                    </details>
                    {isStaff && (
                      <details open className="group/sec rounded-lg border overflow-hidden border-rose-300 bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 px-2 py-1.5">
                        <summary className="sticky top-0 z-10 -mx-2 -mt-1.5 mb-1 flex cursor-pointer list-none items-center justify-between rounded-t-lg bg-rose-100 dark:bg-rose-500/25 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-200 shadow-sm">{isAdmin ? "365 Staff" : isAdvertising ? "Partner / Advertising" : isModerator ? "Moderation" : isSupport ? "Support" : "Sales Rep"}<ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/sec:rotate-180" /></summary>
                        <div className="flex flex-col gap-0.5">

                          {(isSales || isAdvertising || isAdmin) && (
                            <SheetClose asChild>
                              <Link
                                to="/dashboard/partner"
                                className="flex items-center gap-2 rounded-md bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                              >
                                <LayoutDashboard className="h-4 w-4" /> Partner Hub
                                <span className="ml-auto text-[10px] font-medium opacity-80">All-in-one</span>
                              </Link>
                            </SheetClose>
                          )}

                          {(isModerator || isAdmin) && (
                            <>
                              <SheetClose asChild>
                                <Link
                                  to="/admin/listings"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <ListChecks className="h-4 w-4" /> Moderate listings
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/admin/businesses"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Building2 className="h-4 w-4" /> Business directory
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/admin/verifications"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <ShieldCheck className="h-4 w-4" /> Verifications
                                </Link>
                              </SheetClose>
                            </>
                          )}
                          {(isSupport || isAdmin) && (
                            <>
                              <SheetClose asChild>
                                <Link
                                  to="/admin/reports"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <LifeBuoy className="h-4 w-4" /> Activity &amp; reports
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/admin/qr-leads"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Inbox className="h-4 w-4" /> QR leads
                                </Link>
                              </SheetClose>
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <SheetClose asChild>
                                <Link
                                  to="/admin/sales-reps"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Users className="h-4 w-4" /> Manage sales reps
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/admin/franchise"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Handshake className="h-4 w-4" /> Franchise queue
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/admin"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Shield className="h-4 w-4" /> Admin console
                                </Link>
                              </SheetClose>
                            </>
                          )}
                        </div>
                      </details>
                    )}


                  </>
                )}
              </div>

              <div className="border-t border-border p-3">
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <SheetClose asChild>
                      <Button asChild variant="outline" className="w-full gap-2">
                        <Link to="/login">
                          <LogIn className="h-4 w-4" /> Sign in
                        </Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="w-full gap-2">
                        <Link to="/signup">
                          <UserPlus className="h-4 w-4" /> Sign up
                        </Link>
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

type MyBiz = { id: string; name: string; type_slug: string | null };
type BusinessSetup = {
  needed: boolean;
  kind: string | null;
  kindLabel: string | null;
  name: string | null;
};

function kindToLabel(k: string | null): string | null {
  if (!k) return null;
  return k
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function useMyBusinesses(userId?: string): { list: MyBiz[]; setup: BusinessSetup } {
  const [list, setList] = useState<MyBiz[]>([]);
  const [setup, setSetup] = useState<BusinessSetup>({
    needed: false,
    kind: null,
    kindLabel: null,
    name: null,
  });
  useEffect(() => {
    if (!userId) {
      setList([]);
      setSetup({ needed: false, kind: null, kindLabel: null, name: null });
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: biz }, { data: prof }] = await Promise.all([
        supabase
          .from("businesses")
          .select("id,name,type_slug,status")
          .eq("owner_id", userId)
          .in("status", ["active", "pending", "hidden"])
          .order("created_at", { ascending: false })
          .limit(6),
        (supabase as any)
          .from("profiles")
          .select("seller_type, business_kind, business_name")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const rows = (biz ?? []) as MyBiz[];
      setList(rows);
      const sellerType = (prof as any)?.seller_type as string | undefined;
      const kind = ((prof as any)?.business_kind as string | null) ?? null;
      const bname = ((prof as any)?.business_name as string | null) ?? null;
      setSetup({
        needed: sellerType === "business" && rows.length === 0,
        kind,
        kindLabel: kindToLabel(kind),
        name: bname,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return { list, setup };
}

