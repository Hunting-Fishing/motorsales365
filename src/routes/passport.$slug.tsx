import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShieldCheck, Car, Wrench, ExternalLink, Calendar } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/passport/$slug")({
  loader: async ({ params }) => {
    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select("id, make, model, year, color, plate_number, nickname, cover_url, is_public, passport_slug, created_at")
      .eq("passport_slug", params.slug)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!vehicle) throw notFound();
    const { data: records } = await supabase
      .from("vehicle_service_records")
      .select("id, performed_at, mileage_km, service_type, title, shop_name, cost_php, notes, receipt_url")
      .eq("vehicle_id", vehicle.id)
      .order("performed_at", { ascending: false });
    return { vehicle, records: records ?? [] };
  },
  head: ({ loaderData, params }) => {
    const v = loaderData?.vehicle as any;
    const url = `https://365motorsales.com/passport/${params.slug}`;
    if (!v) return { meta: [{ title: "Vehicle passport — 365 MotorSales" }] };
    const name = v.nickname || `${v.year ? v.year + " " : ""}${v.make} ${v.model}`;
    const title = `${name} — Vehicle passport | 365 MotorSales`;
    const desc = `Verified service history for ${v.make} ${v.model}${v.year ? ` (${v.year})` : ""}. Powered by 365 MotorSales Philippines.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(v.cover_url ? [{ property: "og:image", content: v.cover_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Passport not found</h1>
        <p className="mt-2 text-muted-foreground">This vehicle passport is private or doesn't exist.</p>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="container mx-auto p-12 text-center">
        <h1 className="font-display text-xl font-semibold">Couldn't load passport</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-4 underline">Retry</button>
      </div>
    </SiteLayout>
  ),
  component: PassportPage,
});

function PassportPage() {
  const { vehicle, records } = Route.useLoaderData();
  const v: any = vehicle;
  const name = v.nickname || `${v.year ? v.year + " " : ""}${v.make} ${v.model}`;
  const totalSpent = records.reduce((s: number, r: any) => s + Number(r.cost_php || 0), 0);
  const lastMileage = records.find((r: any) => r.mileage_km)?.mileage_km;

  const fullUrl = `https://365motorsales.com/passport/${v.passport_slug}`;

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
              <Badge variant="secondary" className="gap-1 print:hidden"><ShieldCheck className="h-3 w-3" /> Verified passport</Badge>
              <span className="hidden text-xs uppercase tracking-wide text-muted-foreground print:inline">Verified vehicle passport — 365motorsales.com</span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight print:text-2xl">{name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {v.make} {v.model} {v.year ? `· ${v.year}` : ""} {v.color ? `· ${v.color}` : ""} {v.plate_number ? `· ${v.plate_number}` : ""}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-3 print:grid-cols-3">
              <Stat label="Records" value={records.length.toString()} />
              <Stat label="Total spent" value={totalSpent > 0 ? formatPHP(totalSpent) : "—"} />
              <Stat label="Latest mileage" value={lastMileage ? `${lastMileage.toLocaleString()} km` : "—"} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 print:hidden">
              <PassportShareSection url={fullUrl} vehicleName={name} />
            </div>

            {/* Inline QR for quick offline access */}
            <div className="mt-5 hidden items-center gap-4 rounded-lg border border-border bg-background p-4 print:flex">
              <QRCodeSVG value={fullUrl} size={80} level="M" includeMargin bgColor="#ffffff" fgColor="#0f172a" />
              <div>
                <p className="text-sm font-medium">Scan to verify online</p>
                <p className="text-xs text-muted-foreground">{fullUrl}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5 print:border-0 print:bg-white print:p-0">
          <h2 className="font-display text-lg font-semibold">Service history</h2>
          <p className="text-xs text-muted-foreground print:text-gray-500">Records added by the owner. Owner-verified, append-only.</p>

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
                      <Badge variant="secondary" className="text-[10px]">{SERVICE_TYPE_LABELS[r.service_type] ?? r.service_type}</Badge>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {formatDate(r.performed_at)}
                      {r.mileage_km ? ` · ${r.mileage_km.toLocaleString()} km` : ""}
                      {r.shop_name ? ` · ${r.shop_name}` : ""}
                      {r.cost_php ? ` · ${formatPHP(r.cost_php)}` : ""}
                    </p>
                    {r.notes && <p className="mt-1.5 text-sm">{r.notes}</p>}
                    {r.receipt_url && (
                      <a href={r.receipt_url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline print:hidden">
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

        {/* Print footer */}
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
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground print:text-gray-500">{label}</p>
    </div>
  );
}
