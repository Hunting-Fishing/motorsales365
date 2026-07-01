import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeCanvas } from "qrcode.react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { siteOrigin } from "@/lib/site-config";
import { getMyPartnerProgramProfile } from "@/lib/partner-program.functions";
import { formatPHP } from "@/lib/format";
import { InfluencerDisclosure } from "@/components/influencer-disclosure";

export const Route = createFileRoute("/dashboard/partner-program")({
  component: PartnerDashboard,
});

function PartnerDashboard() {
  const fetchProfile = useServerFn(getMyPartnerProgramProfile);
  const { data, isLoading } = useQuery({
    queryKey: ["partner-program", "me"],
    queryFn: () => fetchProfile({}),
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-10">Loading…</div>
      </SiteLayout>
    );
  }

  if (!data?.partner) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-2xl px-4 py-10 text-center">
          <h1 className="font-display text-3xl font-bold">Partner Program</h1>
          <p className="mt-2 text-muted-foreground">
            You're not an approved partner yet.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild><Link to="/partner-program/apply">Apply now</Link></Button>
            <Button asChild variant="outline"><Link to="/partner-program">Learn more</Link></Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const partner = data.partner as any;
  const link = `${siteOrigin()}/?ref=${partner.referral_code}`;
  const totals = data.totals!;
  const events = data.events;

  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Copied"));

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Partner dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {partner.display_name} · Code <code>{partner.referral_code}</code>
            </p>
          </div>
          <Badge variant={partner.active ? "default" : "secondary"}>
            {partner.active ? "Active" : "Paused"}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[240px_1fr]">
          <Card className="flex flex-col items-center gap-3 p-4">
            <QRCodeCanvas value={link} size={200} includeMargin />
            <p className="text-xs text-muted-foreground text-center break-all">{link}</p>
            <Button size="sm" variant="outline" onClick={() => copy(link)}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy link
            </Button>
          </Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Pending", value: totals.pending, tone: "text-amber-600" },
              { label: "Approved", value: totals.approved, tone: "text-primary" },
              { label: "Paid", value: totals.paid, tone: "text-green-600" },
              { label: "Clawed back", value: totals.clawed_back, tone: "text-destructive" },
            ].map((s) => (
              <Card key={s.label} className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`mt-1 text-xl font-bold ${s.tone}`}>{formatPHP(s.value)}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mt-6">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Commission events</h2>
            <p className="text-xs text-muted-foreground">
              Aggregated line items only — no customer personal information is shown.
            </p>
          </div>
          <div className="divide-y divide-border">
            {events.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No events yet.</p>
            ) : (
              events.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{e.event_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.event_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPHP(Number(e.commission_php))}</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {String(e.status).replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="mt-6">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Payout history</h2>
          </div>
          <div className="divide-y divide-border">
            {((data as any).payouts ?? []).length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No payouts yet.</p>
            ) : (
              (data as any).payouts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{p.method}{p.reference ? ` · ${p.reference}` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                      {p.paid_at ? ` · paid ${new Date(p.paid_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPHP(Number(p.amount_php))}</p>
                    <Badge variant="outline" className="mt-1 capitalize">{p.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="mt-6 border-amber-500/40 bg-amber-50/40 p-4 dark:bg-amber-950/20">
          <p className="text-sm font-semibold">Disclosure reminder</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When posting with your link, include:{" "}
            <em>"I may earn a commission if you sign up through my 365 Motor Sales link."</em>{" "}
            plus <code>#365MotorSalesPartner</code>.
          </p>
        </Card>
      </div>
    </SiteLayout>
  );
}
