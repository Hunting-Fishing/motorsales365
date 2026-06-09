/**
 * SYNC GROUP: vehicle-passport
 * Source of truth: .lovable/sync-groups.md#vehicle-passport
 * Extracted from src/routes/passport.$slug.tsx to avoid TanStack
 * router-plugin code-splitter parse bug on large inline components.
 * VERSION: 3
 */
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Car,
  Wrench,
  ExternalLink,
  Calendar,
  Users,
  Droplet,
  AlertTriangle,
  Settings2,
  Crown,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { SiteLayout } from "@/components/site-layout";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPHP } from "@/lib/format";
import { PassportShareSection } from "@/components/passport-share-section";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  oil_change: "Oil change",
  tire_change: "Tires",
  brake_service: "Brakes",
  battery: "Battery",
  tune_up: "Tune-up",
  transmission: "Transmission",
  inspection: "Inspection",
  registration: "Registration",
  insurance: "Insurance",
  accident_repair: "Accident repair",
  other: "Other",
};

export function PassportPage({
  vehicle,
  records,
  photos,
}: {
  vehicle: any;
  records: any[];
  photos: any[];
}) {
  const v: any = vehicle;
  const name = v.nickname || `${v.year ? v.year + " " : ""}${v.make} ${v.model}`;
  const totalSpent = records.reduce(
    (s: number, r: any) => s + Number(r.cost_php || 0),
    0,
  );
  const lastMileage = records.find((r: any) => r.mileage_km)?.mileage_km;
  const disclosures = (v.disclosures || {}) as {
    flood?: string;
    accident?: string;
    notes?: string;
  };
  const ownerCount = Number(v.ownership_count || 1);
  const fullUrl = `https://www.365motorsales.com/passport/${v.passport_slug}`;

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-8 print:py-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card print:border-0 print:bg-white print:shadow-none">
          {v.cover_url ? (
            <div className="aspect-[16/9] w-full overflow-hidden bg-muted print:hidden">
              <img src={v.cover_url} alt={name} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-muted print:hidden">
              <Car className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          <div className="p-6 print:p-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 print:hidden">
                <ShieldCheck className="h-3 w-3" /> Verified passport
              </Badge>
              {v.passport_premium && v.passport_premium_until && new Date(v.passport_premium_until) > new Date() && (
                <Badge className="gap-1 bg-amber-500 text-white print:hidden">
                  <Crown className="h-3 w-3" /> Premium
                </Badge>
              )}
              <span className="hidden text-xs uppercase tracking-wide text-muted-foreground print:inline">
                Verified vehicle passport — 365motorsales.com
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight print:text-2xl">
              {name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {v.make} {v.model} {v.year ? `· ${v.year}` : ""}{" "}
              {v.color ? `· ${v.color}` : ""}{" "}
              {v.plate_number ? `· ${v.plate_number}` : ""}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 print:grid-cols-3">
              <Stat label="Records" value={records.length.toString()} />
              <Stat
                label="Total spent"
                value={totalSpent > 0 ? formatPHP(totalSpent) : "—"}
              />
              <Stat
                label="Latest mileage"
                value={lastMileage ? `${lastMileage.toLocaleString()} km` : "—"}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 print:hidden">
              <PassportShareSection url={fullUrl} vehicleName={name} />
            </div>
            <div className="mt-5 hidden items-center gap-4 rounded-lg border border-border bg-background p-4 print:flex">
              <QRCodeSVG
                value={fullUrl}
                size={80}
                level="M"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
              <div>
                <p className="text-sm font-medium">Scan to verify online</p>
                <p className="text-xs text-muted-foreground">{fullUrl}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <Users className="h-4 w-4" /> Ownership
            </h3>
            <p className="mt-2 text-sm">
              {ownerCount === 1 ? "1st owner (original)" : `Owner #${ownerCount}`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reported by current owner. Names are not shown publicly.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <AlertTriangle className="h-4 w-4" /> Disclosures
            </h3>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Droplet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Flood:</span>
                <DisclosureBadge level={disclosures.flood} />
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Accident:</span>
                <DisclosureBadge level={disclosures.accident} />
              </div>
            </div>
            {disclosures.notes && (
              <p className="mt-2 text-xs text-muted-foreground">{disclosures.notes}</p>
            )}
          </div>
        </div>

        {v.modifications && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <Settings2 className="h-4 w-4" /> Modifications & upgrades
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm">{v.modifications}</p>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-base font-semibold">Photos</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((p: any) => (
                <figure
                  key={p.id}
                  className="overflow-hidden rounded-md border border-border bg-muted"
                >
                  <img
                    src={p.url}
                    alt={p.caption || name}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  {p.caption && (
                    <figcaption className="px-2 py-1 text-[11px] text-muted-foreground">
                      {p.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-border bg-card p-5 print:border-0 print:bg-white print:p-0">
          <h2 className="font-display text-lg font-semibold">Service history</h2>
          <p className="text-xs text-muted-foreground print:text-gray-500">
            Records added by the owner. Owner-verified, append-only.
          </p>
          {records.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground print:border-gray-300">
              No service records published yet.
            </p>
          ) : (
            <ol className="mt-4 relative space-y-4 border-l border-border pl-5">
              {records.map((r: any) => (
                <li key={r.id} className="relative print:break-inside-avoid">
                  <span className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground print:hidden">
                    <Wrench className="h-2.5 w-2.5" />
                  </span>
                  <div className="rounded-md border border-border bg-background p-3 print:border-gray-200 print:bg-white">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.title}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {SERVICE_TYPE_LABELS[r.service_type] ?? r.service_type}
                      </Badge>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {formatDate(r.performed_at)}
                      {r.mileage_km ? ` · ${r.mileage_km.toLocaleString()} km` : ""}
                      {r.shop_name ? ` · ${r.shop_name}` : ""}
                      {r.cost_php ? ` · ${formatPHP(r.cost_php)}` : ""}
                    </p>
                    {r.notes && <p className="mt-1.5 text-sm">{r.notes}</p>}
                    {r.receipt_url && (
                      <a
                        href={r.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline print:hidden"
                      >
                        View receipt <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-center print:hidden">
          <p className="text-sm">
            Want a passport for your own car?{" "}
            <Link to="/dashboard/vehicles" className="font-medium text-primary hover:underline">
              Start one here
            </Link>
            .
          </p>
        </div>

        <div className="mt-8 hidden text-center text-xs text-muted-foreground print:block">
          <p>Generated by 365 MotorSales — Verified vehicle passport</p>
          <p className="mt-1">{fullUrl}</p>
        </div>
      </div>
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3 text-center print:border-gray-200 print:bg-white">
      <p className="font-display text-lg font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground print:text-gray-500">
        {label}
      </p>
    </div>
  );
}

function DisclosureBadge({ level }: { level?: string }) {
  const l = (level || "unknown").toLowerCase();
  const map: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    none: { label: "None reported", variant: "secondary" },
    minor: { label: "Minor", variant: "outline" },
    major: { label: "Major", variant: "destructive" },
    unknown: { label: "Not disclosed", variant: "outline" },
  };
  const cfg = map[l] || map.unknown;
  return (
    <Badge variant={cfg.variant} className="text-[10px]">
      {cfg.label}
    </Badge>
  );
}
