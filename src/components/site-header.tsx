import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Plus, Heart, MessageSquare, LogOut, Shield, User as UserIcon, Eye } from "lucide-react";
import { useAuth, type SellerType } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { CurrencySwitcher } from "@/components/currency-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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

const SELLER_VIEW_OPTIONS: { value: SellerType; label: string }[] = [
  { value: "private", label: "Private seller" },
  { value: "dealer", label: "Dealer" },
  { value: "repair_shop", label: "Repair shop" },
  { value: "insurance", label: "Insurance" },
];

export function SiteHeader() {
  const {
    user, loading, isAdmin, isStaff, signOut,
    realSellerType, effectiveSellerType, simulatedSellerType, setSimulatedSellerType,
  } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2" aria-label="365 MotorSales Philippines home">
            <BrandLogo size={44} className="shrink-0" />
            <div className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-lg font-bold tracking-tight">365 MotorSales</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Philippines</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.category}
                to="/browse/$category"
                params={{ category: n.category }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to={BUSINESSES_LINK.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {BUSINESSES_LINK.label}
            </Link>
            <Link
              to={RIDES_LINK.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {RIDES_LINK.label}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <CurrencySwitcher />
          <Button asChild className="hidden sm:inline-flex" variant="default">
            <Link to="/sell"><Plus className="mr-1 h-4 w-4" /> Post a listing</Link>
          </Button>

          {user && isStaff && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="hidden md:inline">View as: {SELLER_VIEW_OPTIONS.find((o) => o.value === effectiveSellerType)?.label ?? effectiveSellerType}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {SELLER_VIEW_OPTIONS.map((o) => (
                  <DropdownMenuItem
                    key={o.value}
                    onClick={() => setSimulatedSellerType(o.value === realSellerType ? null : o.value)}
                  >
                    {effectiveSellerType === o.value ? "✓ " : "  "}{o.label}
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
                <Button variant="outline" size="sm" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild><Link to="/dashboard">My listings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/dashboard/favorites"><Heart className="mr-2 h-4 w-4" />Favorites</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/dashboard/messages"><MessageSquare className="mr-2 h-4 w-4" />Messages</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/dashboard/profile">Profile</Link></DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/admin"><Shield className="mr-2 h-4 w-4" />Admin</Link></DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-8 flex flex-col gap-1">
                {NAV.map((n) => (
                  <Link key={n.category} to="/browse/$category" params={{ category: n.category }} className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary">
                    {n.label}
                  </Link>
                ))}
                <Link to={BUSINESSES_LINK.to} className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary">{BUSINESSES_LINK.label}</Link>
                <Link to={RIDES_LINK.to} className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary">{RIDES_LINK.label}</Link>
                <Link to="/sell" className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary">Post a listing</Link>
                {!user && (
                  <>
                    <Link to="/login" className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary">Sign in</Link>
                    <Link to="/signup" className="rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary">Sign up</Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
