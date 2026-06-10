import { Link, useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { useAuth, type SellerType } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

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

const SELLER_VIEW_OPTIONS: { value: SellerType; label: string }[] = [
  { value: "private", label: "Private seller" },
  { value: "dealer", label: "Dealer" },
  { value: "repair_shop", label: "Repair shop" },
  { value: "insurance", label: "Insurance" },
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
  } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

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
              Welcome: <span className="font-medium text-foreground">{profileName}</span>
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

          {user && isStaff && (
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
              <DropdownMenuContent align="end" className="w-56">
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
