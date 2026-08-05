import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, Loader2, TrendingUp, User } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/reports/technician/$id")({
  head: () => ({
    meta: [
      { title: "Technician P&L — Shop Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TechnicianPnlPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Technician P&amp;L</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found</div></SiteLayout>,
});

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

function peso(n: number) {
  return `₱${Math.round(n).toLocaleString()}`;
}
function hoursFmt(seconds: number) {
  return (seconds / 3600).toFixed(1);
}

async function fetchTechPnl(id: string, from: string, to: string) {
  const sm = smSupabase as any;
  const fromISO = new Date(from + "T00:00:00").toISOString();
  const toISO = new Date(to + "T23:59:59").toISOString();

  const [{ data: prof }, { data: entries }, { data: rates }] = await Promise.all([
    sm
      .from("profiles")
      .select("id, full_name, first_name, last_name, job_title, hourly_rate, cost_rate")
      .eq("id", id)
      .maybeSingle(),
    sm
      .from("work_order_time_entries")
      .select("id, work_order_id, duration, billable, start_time, hourly_rate, description")
      .eq("employee_id", id)
      .gte("start_time", fromISO)
      .lte("start_time", toISO)
      .order("start_time", { ascending: false })
      .limit(5000),
    sm.from("labor_rates").select("standard_rate").limit(1).maybeSingle(),
  ]);

  return {
    profile: prof,
    entries: entries ?? [],
    defaultBillRate: Number(rates?.standard_rate ?? 0),
  };
}

function TechnicianPnlPage() {
  const { id } = Route.useParams();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());

  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "tech-pnl", id, from, to],
    queryFn: () => fetchTechPnl(id, from, to),
  });

  const totals = useMemo(() => {
    const entries = data?.entries ?? [];
    const profile: any = data?.profile ?? {};
    const billRate = Number(profile?.hourly_rate ?? data?.defaultBillRate ?? 0);
    const costRate = Number(profile?.cost_rate ?? 0);

    let totalSec = 0;
    let billableSec = 0;
    let nonBillableSec = 0;
    let revenue = 0;
    let laborCost = 0;

    for (const e of entries) {
      const dur = Number(e.duration ?? 0);
      totalSec += dur;
      if (e.billable) {
        billableSec += dur;
        const rate = Number(e.hourly_rate ?? billRate) || 0;
        revenue += (dur / 3600) * rate;
      } else {
        nonBillableSec += dur;
      }
      laborCost += (dur / 3600) * costRate;
    }

    return {
      totalSec,
      billableSec,
      nonBillableSec,
      revenue,
      laborCost,
      net: revenue - laborCost,
      billableRatio: totalSec ? billableSec / totalSec : 0,
      billRate,
      costRate,
    };
  }, [data]);

  const displayName =
    (data?.profile as any)?.full_name ||
    [
      (data?.profile as any)?.first_name,
      (data?.profile as any)?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    id.slice(0, 8);

  const exportCsv = () => {
    const rows = [
      ["Date", "Duration (hrs)", "Billable", "Rate", "Amount", "Description"],
    ];
    for (const e of data?.entries ?? []) {
      const dur = Number(e.duration ?? 0);
      const rate = Number(e.hourly_rate ?? totals.billRate) || 0;
      rows.push([
        String(e.start_time ?? "").slice(0, 10),
        hoursFmt(dur),
        e.billable ? "Yes" : "No",
        String(rate),
        e.billable ? String(((dur / 3600) * rate).toFixed(2)) : "0",
        e.description ?? "",
      ]);
    }
    rows.push([]);
    rows.push(["", "", "", "Revenue", String(totals.revenue.toFixed(2)), ""]);
    rows.push(["", "", "", "Labor cost", String(totals.laborCost.toFixed(2)), ""]);
    rows.push(["", "", "", "Net", String(totals.net.toFixed(2)), ""]);
    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tech-pnl-${id}-${from}-${to}.csv`;
    a.click();
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4">
          <Link
            to="/workspace/reports"
            className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Link>
        </div>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" /> {displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {(data?.profile as any)?.job_title ?? "Technician"} · billable at{" "}
              {peso(totals.billRate)}/hr · cost {peso(totals.costRate)}/hr
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label="Revenue"
                value={peso(totals.revenue)}
                sub={`${hoursFmt(totals.billableSec)}h billable`}
              />
              <Kpi
                label="Labor cost"
                value={peso(totals.laborCost)}
                sub={`${hoursFmt(totals.totalSec)}h total`}
              />
              <Kpi
                label="Net contribution"
                value={peso(totals.net)}
                sub={totals.net >= 0 ? "profitable" : "loss"}
                tone={totals.net >= 0 ? "pos" : "neg"}
              />
              <Kpi
                label="Billable ratio"
                value={`${Math.round(totals.billableRatio * 100)}%`}
                sub={`${hoursFmt(totals.nonBillableSec)}h non-billable`}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Time entries
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {(data?.entries ?? []).length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    No time entries in this period.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.entries ?? []).map((e: any) => {
                        const dur = Number(e.duration ?? 0);
                        const rate = Number(e.hourly_rate ?? totals.billRate) || 0;
                        const amt = e.billable ? (dur / 3600) * rate : 0;
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {String(e.start_time ?? "").slice(0, 10)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {e.description || "—"}
                              {!e.billable && (
                                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                                  non-billable
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              {hoursFmt(dur)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              {rate ? peso(rate) : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs">
                              {amt ? peso(amt) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <p className="mt-4 text-xs text-muted-foreground">
              Revenue uses each entry's hourly rate when set, otherwise the technician's
              billable rate or the shop standard rate. Labor cost uses the technician's
              cost rate (set on their profile).
            </p>
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "pos" | "neg";
}) {
  return (
    <Card
      className={
        tone === "pos"
          ? "border-emerald-500/40"
          : tone === "neg"
            ? "border-rose-500/40"
            : ""
      }
    >
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={
            "mt-2 text-2xl font-bold tabular-nums " +
            (tone === "pos"
              ? "text-emerald-600"
              : tone === "neg"
                ? "text-rose-600"
                : "")
          }
        >
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
