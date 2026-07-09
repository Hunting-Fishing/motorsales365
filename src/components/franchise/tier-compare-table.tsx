import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import type { FranchiseTier } from "@/lib/franchise.functions";

function fmtPct(bps: number) {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

function fmtFee(cents: number) {
  if (!cents) return "Free";
  return `₱${(cents / 100).toLocaleString()}`;
}

export function TierCompareTable({ tiers }: { tiers: FranchiseTier[] }) {
  if (!tiers.length) return null;
  const rows: Array<{ label: string; get: (t: FranchiseTier) => React.ReactNode }> = [
    { label: "Monthly fee", get: (t) => fmtFee(t.monthly_fee_cents) },
    { label: "Setup fee", get: (t) => fmtFee(t.setup_fee_cents) },
    { label: "Parts network discount", get: (t) => fmtPct(t.parts_discount_bps) },
    { label: "Ads & boost discount", get: (t) => fmtPct(t.ad_discount_bps) },
    {
      label: "Shop Manager software",
      get: (t) => (t.includes_shop_manager ? <Check className="text-primary" /> : <X className="text-muted-foreground" />),
    },
    {
      label: "Inventory tools",
      get: (t) => (t.includes_inventory ? <Check className="text-primary" /> : <X className="text-muted-foreground" />),
    },
    {
      label: "Shared customer CRM",
      get: (t) => (t.includes_shared_crm ? <Check className="text-primary" /> : <X className="text-muted-foreground" />),
    },
    {
      label: "Branding",
      get: (t) => <span className="text-sm">{t.branding_rights ?? "—"}</span>,
    },
  ];
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="p-3 text-left font-semibold">Feature</th>
              {tiers.map((t) => (
                <th key={t.slug} className="p-3 text-left font-semibold">
                  <div className="flex items-center gap-2">
                    <span>{t.name}</span>
                    {t.slug === "franchise" ? <Badge>Popular</Badge> : null}
                  </div>
                  <p className="text-xs font-normal text-muted-foreground">{t.tagline}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 ? "bg-secondary/20" : ""}>
                <td className="p-3 font-medium">{r.label}</td>
                {tiers.map((t) => (
                  <td key={t.slug} className="p-3">
                    {r.get(t)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
