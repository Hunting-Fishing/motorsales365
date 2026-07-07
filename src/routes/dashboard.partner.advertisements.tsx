import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Ticket, ShieldCheck, ArrowRight, Inbox } from "lucide-react";

export const Route = createFileRoute("/dashboard/partner/advertisements")({
  component: AdvertisementsTab,
});

function AdvertisementsTab() {
  const cards = [
    { to: "/admin/advertisements/inquiries", label: "Inquiries", desc: "Inbound advertiser leads and CRM.", Icon: Inbox },
    { to: "/admin/advertisements/campaigns", label: "Campaigns", desc: "Sponsored placements and creative.", Icon: Megaphone },
    { to: "/admin/advertisements/promotions", label: "Promotions", desc: "Promo codes and one-off discounts.", Icon: Ticket },
    { to: "/admin/advertisements/approvals", label: "Approvals", desc: "Review pending ad creatives.", Icon: ShieldCheck },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map(({ to, label, desc, Icon }) => (
        <Card key={to} className="p-4">
          <div className="mb-1 flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <p className="font-semibold">{label}</p>
          </div>
          <p className="text-sm text-muted-foreground">{desc}</p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to={to as any}>
              Open <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}
