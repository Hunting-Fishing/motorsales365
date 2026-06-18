import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  UserCog,
  Inbox,
  Megaphone,
  Ticket,
  Store,
  QrCode,
} from "lucide-react";

export const Route = createFileRoute("/admin/sales")({
  component: SalesHub,
  head: () => ({
    meta: [
      { title: "Sales Hub — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Tile = {
  to: string;
  label: string;
  desc: string;
  Icon: any;
  external?: boolean;
};

const TILES: Tile[] = [
  { to: "/admin/accounts", label: "Accounts", desc: "Customer & business accounts, plans, lifetime spend.", Icon: UserCog },
  { to: "/admin/analytics", label: "Analytics", desc: "Traffic, conversions, sales performance.", Icon: BarChart3 },
  { to: "/admin/advertisements/inquiries", label: "Ad Inquiries", desc: "Inbound advertiser inquiries and CRM.", Icon: Inbox },
  { to: "/admin/advertisements/campaigns", label: "Ad Campaigns", desc: "Sponsored placements, scheduling, creative.", Icon: Megaphone },
  { to: "/admin/advertisements/promotions", label: "Promotions & Discounts", desc: "Promo codes and one-off customer discounts.", Icon: Ticket },
  { to: "/admin/shop", label: "Affiliate Shop", desc: "Affiliate networks, products and click analytics.", Icon: Store },
  { to: "/admin/referrals", label: "Referrals", desc: "Staff QR codes and redemption history.", Icon: QrCode },
  { to: "/admin/advertisements/share-kit", label: "My QR / Share Kit", desc: "Apply your QR to printable templates (arm band, shirt, banners).", Icon: QrCode },
  { to: "/admin/lead-offers", label: "Lead Marketplace", desc: "Qualified buyer leads businesses pay to unlock.", Icon: Inbox },
  { to: "/admin/sales-reps", label: "Sales Reps", desc: "Reps, territories and assignments.", Icon: UserCog },
];

function SalesHub() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Sales Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything sales-related in one place — accounts, ads, promotions, referrals and your printable QR share-kit.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map(({ to, label, desc, Icon, external }) => {
          const inner = (
            <>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{label}</div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
            </>
          );
          const className =
            "block rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-secondary/40";
          return external ? (
            <a key={to} href={to} className={className}>
              {inner}
            </a>
          ) : (
            <Link key={to} to={to} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
