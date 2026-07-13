import { Link, useLocation, useNavigate } from "react-router-dom";
import { useWeldingSettings } from "@/contexts/WeldingSettingsContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  FileText, Package, DollarSign, Users, Inbox, BarChart3,
  ShoppingCart, Warehouse, LogOut, Home, ChevronLeft, Image, Settings, Menu,
  CalendarDays, Handshake, Link2, MoreHorizontal
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const weldingAdminLinks = [
  { label: "Overview", to: "/welding", icon: BarChart3 },
  { label: "Gallery", to: "/welding/gallery", icon: Image },
  { label: "Quotes", to: "/welding/quotes", icon: FileText },
  { label: "Invoices", to: "/welding/invoices", icon: FileText },
  { label: "Payments Due", to: "/welding/payments-due", icon: DollarSign },
  { label: "Accounts Payable", to: "/welding/accounts-payable", icon: DollarSign },
  { label: "Inventory", to: "/welding/inventory", icon: Warehouse },
  { label: "Purchase Orders", to: "/welding/purchase-orders", icon: ShoppingCart },
  { label: "Customers", to: "/welding/customers", icon: Users },
  { label: "Messages", to: "/welding/messages", icon: Inbox },
  { label: "Calendar", to: "/welding/calendar", icon: CalendarDays },
  { label: "Sales", to: "/welding/sales", icon: Handshake },
  { label: "Links", to: "/welding/links", icon: Link2 },
  { label: "Settings", to: "/welding/settings", icon: Settings },
];

const WeldingAdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { settings } = useWeldingSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const quickLinks = (settings.mobile_quick_links || [])
    .map(label => weldingAdminLinks.find(l => l.label === label))
    .filter(Boolean) as typeof weldingAdminLinks;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r hidden lg:flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 text-sidebar-foreground hover:opacity-80">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Back to Main</span>
          </Link>
          <h2 className="font-heading font-bold text-lg mt-2">Welding Admin</h2>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {weldingAdminLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === link.to
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50"
              }`}
            >
              <link.icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground p-3 flex items-center justify-between border-b">
        <h2 className="font-heading font-bold">Welding</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground"><Menu className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/")}><Home className="h-4 w-4 mr-2" /> Back to Main</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/welding/settings")}><Settings className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive"><LogOut className="h-4 w-4 mr-2" /> Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground border-t">
        <div className="grid grid-cols-6 gap-0">
          {quickLinks.slice(0, 5).map((link) => (
            <Link key={link.to} to={link.to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] transition-colors ${
                location.pathname === link.to ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
              }`}>
              <link.icon className="h-5 w-5" />
              <span className="truncate leading-tight">{link.label.split(" ")[0]}</span>
            </Link>
          ))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] text-sidebar-foreground/70 hover:text-sidebar-foreground w-full">
                <MoreHorizontal className="h-5 w-5" /><span className="leading-tight">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
              <SheetHeader><SheetTitle className="font-heading text-left">All Sections</SheetTitle></SheetHeader>
              <nav className="grid grid-cols-3 gap-2 mt-4 pb-4">
                {weldingAdminLinks.map((link) => (
                  <Link key={link.to} to={link.to} onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs font-medium transition-colors ${
                      location.pathname === link.to ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                    }`}>
                    <link.icon className="h-5 w-5" /><span className="text-center leading-tight">{link.label}</span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-4 pt-16 pb-20 md:px-6 md:pt-16 md:pb-20 lg:px-8 lg:pt-8 lg:pb-8 max-w-full">{children}</div>
      </main>
    </div>
  );
};

export default WeldingAdminLayout;
