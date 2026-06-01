import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download } from "lucide-react";
import { getOrgPerformance } from "@/lib/leads.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const searchSchema = z.object({ orgId: z.string().uuid() });

export const Route = createFileRoute("/dashboard/team/performance")({
  validateSearch: searchSchema,
  component: PerformancePage,
});

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PerformancePage() {
  const { orgId } = Route.useSearch();
  const [days, setDays] = useState(30);
  const fetchPerf = useServerFn(getOrgPerformance);
  const { data, isLoading } = useQuery({
    queryKey: ["org-perf", orgId, days],
    queryFn: () => fetchPerf({ data: { orgId, sinceDays: days } }),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const exportCsv = () => {
    const header = ["Sales rep", "Role", "Total", "New", "In progress", "Won", "Lost", "Win rate %"];
    const rows = data.members
      .slice()
      .sort((a: any, b: any) => b.won - a.won || b.total - a.total)
      .map((m: any) => [
        m.profile?.full_name ?? m.userId,
        m.role,
        m.total,
        m.new,
        m.in_progress,
        m.won,
        m.lost,
        m.win_rate === null ? "" : m.win_rate,
      ]);
    downloadCsv(`team-performance-${days}d-${new Date().toISOString().slice(0, 10)}.csv`, [
      header,
      ...rows,
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Range:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${days === d ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
          >
            Last {d} days
          </button>
        ))}
        {data.unassigned > 0 && (
          <Badge variant="outline" className="text-amber-600">
            {data.unassigned} unassigned
          </Badge>
        )}
        <Button size="sm" variant="outline" className="ml-auto" onClick={exportCsv}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2">Sales rep</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">New</th>
              <th className="px-3 py-2 text-right">In progress</th>
              <th className="px-3 py-2 text-right">Won</th>
              <th className="px-3 py-2 text-right">Lost</th>
              <th className="px-3 py-2 text-right">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {data.members
              .slice()
              .sort((a: any, b: any) => b.won - a.won || b.total - a.total)
              .map((m: any) => (
              <tr key={m.userId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{m.profile?.full_name ?? m.userId}</td>
                <td className="px-3 py-3 text-muted-foreground">{m.role}</td>
                <td className="px-3 py-3 text-right font-semibold">{m.total}</td>
                <td className="px-3 py-3 text-right">{m.new}</td>
                <td className="px-3 py-3 text-right">{m.in_progress}</td>
                <td className="px-3 py-3 text-right text-emerald-600">{m.won}</td>
                <td className="px-3 py-3 text-right text-rose-600">{m.lost}</td>
                <td className="px-3 py-3 text-right">{m.win_rate === null ? "—" : `${m.win_rate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
