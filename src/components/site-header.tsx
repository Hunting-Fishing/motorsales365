import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  UserCog,
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
    signOut,
    realSellerType,
    effectiveSellerType,
    simulatedSellerType,
    setSimulatedSellerType,
    realIsAdmin,
    effectiveRoles,
    simulatedRoles,
    setSimulatedRoles,
  } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const { list: myBusinesses, setup: businessSetup } = useMyBusinesses(user?.id);


  return (
    <header className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <Link
            to="/"
            className="flex items-center gap-2"
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

          <nav className="hidden items-center gap-0.5 xl:flex">
            {NAV.map((n) => (
              <Link
                key={n.category}
                to="/browse/$category"
                params={{ category: n.category }}
                className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to={WANTED_LINK.to}
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {WANTED_LINK.label}
            </Link>
            <Link
              to={PARTS_WANTED_LINK.to}
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {PARTS_WANTED_LINK.label}
            </Link>
            <Link
              to={BUSINESSES_LINK.to}
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {BUSINESSES_LINK.label}
            </Link>
            <Link
              to={RIDES_LINK.to}
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {RIDES_LINK.label}
            </Link>
            <Link
              to="/map"
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Map
            </Link>
            <Link
              to="/parts"
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Parts
            </Link>
            <Link
              to="/shop"
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Shop
            </Link>
            <Link
              to="/learn"
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Learn
            </Link>
            <Link
              to="/games"
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Games
            </Link>

            <Link
              to="/shop-manager"
              className="rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Shop Manager
            </Link>
            <Link
              to="/export"
              className="hidden rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground xl:inline-flex"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              Export
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
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


          {user && !loading && realIsAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:inline-flex gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="hidden md:inline">
                    View as:{" "}
                    {SELLER_VIEW_OPTIONS.find((o) => o.value === effectiveSellerType)?.label ??
                      effectiveSellerType}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {SELLER_VIEW_OPTIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    onClick={() =>
                      setSimulatedSellerType(o.value === realSellerType ? null : o.value)
                    }
                  >
                    {effectiveSellerType === o.value ? "✓ " : "  "}
                    {o.label}
                  </DropdownMenuItem>
                ))}
                {simulatedSellerType && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSimulatedSellerType(null)}>
                      Reset to my account ({realSellerType})
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Role simulator — real admins only */}
          {user && !loading && realIsAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:inline-flex gap-2" title="Simulate staff roles (UI only)">
                  <UserCog className="h-4 w-4" />
                  <span className="hidden lg:inline">
                    Role:{" "}
                    {simulatedRoles && simulatedRoles.length > 0
                      ? simulatedRoles.join(", ")
                      : "Admin (real)"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Simulate role (UI only)
                </div>
                {ROLE_SIM_OPTIONS.map((o) => {
                  const active = (simulatedRoles ?? []).includes(o.value);
                  return (
                    <DropdownMenuItem
                      key={o.value}
                      onSelect={(e) => {
                        e.preventDefault();
                        const current = simulatedRoles ?? [];
                        const next = active
                          ? current.filter((r) => r !== o.value)
                          : [...current, o.value];
                        setSimulatedRoles(next.length ? next : null);
                      }}
                    >
                      {active ? "✓ " : "  "}
                      {o.label}
                    </DropdownMenuItem>
                  );
                })}
                {simulatedRoles && simulatedRoles.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setSimulatedRoles(null)}>
                      Reset to my real roles
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-[10px] text-muted-foreground">
                  Effective: {effectiveRoles.join(", ") || "none"}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {loading ? (
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
                      {isAdmin ? "365 Staff" : "Sales Rep"}
                    </div>
                    {isSales && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/team/leads">
                            <Inbox className="mr-2 h-4 w-4" />
                            My leads
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/referral">
                            <Briefcase className="mr-2 h-4 w-4" />
                            My referrals
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/team/performance">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Performance
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
                className="xl:hidden h-9 w-9"
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

              <div className="flex-1 overflow-y-auto px-3 py-4">
                <SheetClose asChild>
                  <Link
                    to="/sell"
                    className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
                  >
                    <Plus className="h-5 w-5" /> Post a listing
                  </Link>
                </SheetClose>

                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Browse
                </p>
                <div className="flex flex-col gap-0.5">
                  {NAV.map((n) => (
                    <SheetClose asChild key={n.category}>
                      <Link
                        to="/browse/$category"
                        params={{ category: n.category }}
                        className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                        activeProps={{ className: "bg-secondary text-foreground" }}
                      >
                        {n.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      to={WANTED_LINK.to}
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                      activeProps={{ className: "bg-secondary text-foreground" }}
                    >
                      {WANTED_LINK.label}
                    </Link>
                  </SheetClose>
                </div>

                <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Marketplace
                </p>
                <div className="flex flex-col gap-0.5">
                  <SheetClose asChild>
                    <Link
                      to={BUSINESSES_LINK.to}
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      {BUSINESSES_LINK.label}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to={RIDES_LINK.to}
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      {RIDES_LINK.label}
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/map"
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      Map
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/shop"
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      Shop
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/shop-manager"
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      Shop Manager
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/games"
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      Games
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/learn"
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      Learn
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/partner-training"
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      Partner training
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/pricing"
                      className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      Pricing
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/support"
                      className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                    >
                      <LifeBuoy className="h-4 w-4" /> Help &amp; Support
                    </Link>
                  </SheetClose>
                </div>

                {user && (
                  <>
                    {(myBusinesses.length > 0 || businessSetup.needed) && (
                      <>
                        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          My businesses
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {myBusinesses.map((b) => (
                            <div key={b.id} className="flex items-center gap-1 px-3">
                              <SheetClose asChild>
                                <Link
                                  to="/dashboard/business/$businessId"
                                  params={{ businessId: b.id }}
                                  className="flex-1 flex items-center gap-2 rounded-md py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Building2 className="h-4 w-4 text-primary" />
                                  <span className="truncate">{b.name}</span>
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/dashboard/business/$businessId/billing"
                                  params={{ businessId: b.id }}
                                  aria-label="Billing & plan"
                                  className="rounded-md p-2 hover:bg-secondary"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Link>
                              </SheetClose>
                            </div>
                          ))}
                          {businessSetup.needed && (
                            <div className="px-3">
                              <SheetClose asChild>
                                <Link
                                  to="/businesses/submit"
                                  className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-3 text-sm font-medium text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
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
                      </>
                    )}
                    <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Account
                    </p>
                    <div className="flex flex-col gap-0.5">
                      <SheetClose asChild>
                        <Link
                          to="/dashboard"
                          className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                        >
                          My listings
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/dashboard/favorites"
                          className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                        >
                          Favorites
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/dashboard/messages"
                          className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                        >
                          Messages
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/dashboard/billing"
                          className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                        >
                          Billing
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          to="/dashboard/profile"
                          className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                        >
                          Profile
                        </Link>
                      </SheetClose>
                    </div>
                    {isStaff && (
                      <>
                        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isAdmin ? "365 Staff" : "Sales Rep"}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {isSales && (
                            <>
                              <SheetClose asChild>
                                <Link
                                  to="/dashboard/team/leads"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Inbox className="h-4 w-4" /> My leads
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/dashboard/referral"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Briefcase className="h-4 w-4" /> My referrals
                                </Link>
                              </SheetClose>
                              <SheetClose asChild>
                                <Link
                                  to="/dashboard/team/performance"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <BarChart3 className="h-4 w-4" /> Performance
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
                                  to="/admin"
                                  className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                                >
                                  <Shield className="h-4 w-4" /> Admin console
                                </Link>
                              </SheetClose>
                            </>
                          )}
                        </div>
                      </>
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

