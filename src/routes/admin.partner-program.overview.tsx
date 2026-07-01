import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminListPartnerOverview,
  adminGetPartnerHistory,
} from "@/lib/partner-program.functions";
import { formatPHP } from "@/lib/format";
import { Download } from "lucide-react";

export const Route = createFileRoute("/admin/partner-program/overview")({
  component: OverviewPage,
});

type Row = {
  partner_id: string;
  display_name: string;
  referral_code: string;
  active: boolean;
  payout_method: string | null;
  clicks: number;
  signups: number;
  events_total: number;
  commission_pending: number;
  commission_approved: number;
  commission_paid: number;
  commission_clawed_back: number;
  chargebacks: number;
  payouts_paid_total: number;
  payouts_pending_total: number;
  last_event_at: string | null;
};

function toCSV(rows: Record<string, any>[], columns: string[]) {
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function OverviewPage() {
  const listFn = useServerFn(adminListPartnerOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pp-overview"],
    queryFn: () => listFn({}),
  });
  const [q, setQ] = useState("");
  const [drill, setDrill] = useState<string | null>(null);

  const rows: Row[] = data?.rows ?? [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.display_name?.toLowerCase().includes(s) ||
        r.referral_code?.toLowerCase().includes(s),
    );
  }, [rows, q]);

  const exportAll = () => {
    const cols = [
      "display_name","referral_code","active","clicks","signups","events_total",
      "commission_pending","commission_approved","commission_paid","commission_clawed_back",
      "chargebacks","payouts_paid_total","payouts_pending_total","payout_method","last_event_at",
    ];
    download(`partner-overview-${new Date().toISOString().slice(0,10)}.csv`, toCSV(filtered as any, cols));
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Partner performance</h1>
            <p className="text-sm text-muted-foreground">
              Clicks, signups, commissions, chargebacks and payouts per partner.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-program">Applications</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/partner-program/ledger">Ledger</Link>
            </Button>
          </div>
        </div>

        {data?.totals && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <Stat label="Partners" value={data.totals.partners} />
            <Stat label="Clicks" value={data.totals.clicks} />
            <Stat label="Signups" value={data.totals.signups} />
            <Stat label="Paid" value={formatPHP(data.totals.commission_paid)} />
            <Stat label="Approved" value={formatPHP(data.totals.commission_approved)} />
            <Stat label="Pending" value={formatPHP(data.totals.commission_pending)} />
            <Stat label="Clawed back" value={formatPHP(data.totals.clawed_back)} />
            <Stat label="Chargebacks" value={data.totals.chargebacks} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search partner or code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Button size="sm" variant="outline" onClick={exportAll}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>

        <Card className="mt-3 overflow-hidden">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No partners.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Partner</th>
                    <th className="p-2 text-right">Clicks</th>
                    <th className="p-2 text-right">Signups</th>
                    <th className="p-2 text-right">Pending</th>
                    <th className="p-2 text-right">Approved</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right">Chargebacks</th>
                    <th className="p-2 text-right">Payouts paid</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.partner_id} className="border-t border-border">
                      <td className="p-2">
                        <div className="font-medium">{r.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.referral_code}
                          {!r.active && <Badge variant="outline" className="ml-2">inactive</Badge>}
                        </div>
                      </td>
                      <td className="p-2 text-right">{r.clicks}</td>
                      <td className="p-2 text-right">{r.signups}</td>
                      <td className="p-2 text-right">{formatPHP(r.commission_pending)}</td>
                      <td className="p-2 text-right">{formatPHP(r.commission_approved)}</td>
                      <td className="p-2 text-right">{formatPHP(r.commission_paid)}</td>
                      <td className="p-2 text-right">
                        {r.chargebacks > 0 ? (
                          <span className="text-destructive">
                            {r.chargebacks} · {formatPHP(r.commission_clawed_back)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-2 text-right">{formatPHP(r.payouts_paid_total)}</td>
                      <td className="p-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setDrill(r.partner_id)}>
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <PartnerDetailDialog partnerId={drill} onClose={() => setDrill(null)} />
      </div>
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <Card className="p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </Card>
  );
}

function PartnerDetailDialog({ partnerId, onClose }: { partnerId: string | null; onClose: () => void }) {
  const historyFn = useServerFn(adminGetPartnerHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pp-history", partnerId],
    queryFn: () => historyFn({ data: { partner_id: partnerId! } }),
    enabled: !!partnerId,
  });

  const exportEvents = () => {
    if (!data?.events) return;
    const cols = ["event_at","event_type","status","amount_php","commission_php","source_ref","clawed_back_reason","payout_id"];
    download(`commissions-${data.partner?.referral_code}.csv`, toCSV(data.events as any, cols));
  };
  const exportPayouts = () => {
    if (!data?.payouts) return;
    const cols = ["created_at","status","amount_php","method","reference","paid_at","notes"];
    download(`payouts-${data.partner?.referral_code}.csv`, toCSV(data.payouts as any, cols));
  };

  return (
    <Dialog open={!!partnerId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {data?.partner?.display_name ?? "Partner"}{" "}
            <span className="text-xs text-muted-foreground">· {data?.partner?.referral_code}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Clicks" value={data.clicks} />
              <Stat label="Signups" value={data.signups} />
              <Stat label="Events" value={data.events.length} />
              <Stat label="Payouts" value={data.payouts.length} />
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Commission events</h3>
                <Button size="sm" variant="outline" onClick={exportEvents}>
                  <Download className="mr-1.5 h-4 w-4" /> CSV
                </Button>
              </div>
              <Card className="overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/70 uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">When</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-right">Commission</th>
                        <th className="p-2 text-left">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.events.length === 0 && (
                        <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No events</td></tr>
                      )}
                      {data.events.map((e: any) => (
                        <tr key={e.id} className="border-t border-border">
                          <td className="p-2">{new Date(e.event_at).toLocaleString()}</td>
                          <td className="p-2 capitalize">{String(e.event_type).replace(/_/g, " ")}</td>
                          <td className="p-2">
                            <Badge variant={e.status === "clawed_back" ? "destructive" : "outline"} className="capitalize">
                              {String(e.status).replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">{formatPHP(Number(e.commission_php))}</td>
                          <td className="p-2 truncate">{e.source_ref ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Payout history</h3>
                <Button size="sm" variant="outline" onClick={exportPayouts}>
                  <Download className="mr-1.5 h-4 w-4" /> CSV
                </Button>
              </div>
              <Card className="overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/70 uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">Created</th>
                        <th className="p-2 text-left">Status</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-left">Method</th>
                        <th className="p-2 text-left">Reference</th>
                        <th className="p-2 text-left">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payouts.length === 0 && (
                        <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">No payouts</td></tr>
                      )}
                      {data.payouts.map((p: any) => (
                        <tr key={p.id} className="border-t border-border">
                          <td className="p-2">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="p-2"><Badge variant="outline" className="capitalize">{p.status}</Badge></td>
                          <td className="p-2 text-right">{formatPHP(Number(p.amount_php))}</td>
                          <td className="p-2">{p.method}</td>
                          <td className="p-2">{p.reference ?? "—"}</td>
                          <td className="p-2">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
