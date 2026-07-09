import { Card } from "@/components/ui/card";
import { PackageCheck, Users, Megaphone, LayoutDashboard } from "lucide-react";

const PILLARS = [
  {
    icon: PackageCheck,
    title: "Parts pricing & network stock",
    body: "Discounted pricing on parts sourced through the 365 network, plus real-time visibility into stock across every partner shop.",
  },
  {
    icon: Users,
    title: "Shared customer CRM",
    body: "One profile per customer across the network. See prior service history and quotes from any partner shop, with the customer's consent.",
  },
  {
    icon: Megaphone,
    title: "Marketing & trust boost",
    body: "Discounted advertising, featured placement on 365 marketplace, and the verified badge customers already recognize.",
  },
  {
    icon: LayoutDashboard,
    title: "Software suite included",
    body: "Shop Manager, inventory, bookings, and staff tools bundled in your membership — no per-seat fees.",
  },
];

export function BenefitsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PILLARS.map((p) => (
        <Card key={p.title} className="p-5">
          <p.icon className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-display text-lg font-semibold">{p.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
        </Card>
      ))}
    </div>
  );
}
