import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Inbox, Megaphone, Ticket, QrCode, History, Settings2, ImageIcon, Eye, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/advertisements")({
  component: AdvertisementsLayout,
  head: () => ({
    meta: [
      { title: "Advertisements — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Tab = {
  to:
    | "/admin/advertisements/inquiries"
    | "/admin/advertisements/campaigns"
    | "/admin/advertisements/promotions"
    | "/admin/advertisements/qr-ads"
    | "/admin/advertisements/history"
    | "/admin/advertisements/slots"
    | "/admin/advertisements/placeholders"
    | "/admin/advertisements/approvals"
    | "/admin/advertisements/preview";
  label: string;
  desc: string;
  Icon: typeof Inbox;
  roles: Array<"admin" | "advertising" | "sales">;
};

const TABS: Tab[] = [
  {
    to: "/admin/advertisements/inquiries",
    label: "Inquiries",
    desc: "Inbound advertiser leads and CRM.",
    Icon: Inbox,
    roles: ["admin", "advertising", "sales"],
  },
  {
    to: "/admin/advertisements/campaigns",
    label: "Campaigns",
    desc: "Sponsored placements, scheduling and creative.",
    Icon: Megaphone,
    roles: ["admin", "advertising"],
  },
  {
    to: "/admin/advertisements/promotions",
    label: "Promotions",
    desc: "Promo codes and one-off customer discounts.",
    Icon: Ticket,
    roles: ["admin", "sales"],
  },
  {
    to: "/admin/advertisements/qr-ads",
    label: "QR Advertisements",
    desc: "Your personal QR on printable templates.",
    Icon: QrCode,
    roles: ["admin", "advertising", "sales"],
  },
  {
    to: "/admin/advertisements/slots",
    label: "Slots",
    desc: "Define ad positions, dimensions and ordering.",
    Icon: Settings2,
    roles: ["admin", "advertising"],
  },
  {
    to: "/admin/advertisements/placeholders",
    label: "Placeholders",
    desc: "Upload and manage default creatives per slot.",
    Icon: ImageIcon,
    roles: ["admin", "advertising"],
  },
  {
    to: "/admin/advertisements/preview",
    label: "Live preview",
    desc: "See what's rendering in each slot right now.",
    Icon: Eye,
    roles: ["admin", "advertising"],
  },
  {
    to: "/admin/advertisements/history",
    label: "History",
    desc: "Legal record of all ad / promo changes.",
    Icon: History,
    roles: ["admin"],
  },
];

function AdvertisementsLayout() {
  const { isAdmin, isSales, isAdvertising } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visible = TABS.filter((t) =>
    t.roles.some((r) => (r === "admin" && isAdmin) || (r === "sales" && isSales) || (r === "advertising" && isAdvertising)),
  );

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Advertisements</h1>
        <p className="text-sm text-muted-foreground">
          Manage advertiser inquiries, sponsored campaigns and customer promotions in one place.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 rounded-lg border bg-card p-1" aria-label="Advertisements sections">
        {visible.map(({ to, label, Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div>
        <Outlet />
      </div>
    </div>
  );
}
