import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getOrgPerformance } from "@/lib/leads.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const searchSchema = z.object({ orgId: z.string().uuid() });

export const Route = createFileRoute("/dashboard/team/performance")({
  validateSearch: searchSchema,
  component: PerformancePage,
});

function PerformancePage() {
  const { orgId } = Route.useSearch();
  const [days, setDays] = useState(30);
  const fetchPerf = useServerFn(getOrgPerformance);
  const { data, isLoading } = useQuery({
    queryKey: ["org-perf", orgId, days],
    queryFn: () => fetchPerf({ data: { orgId, sinceDays: days } }),
  });

  if (isLoading || !data) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
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
          <Badge variant="outline" className="ml-auto text-amber-600">
            {data.unassigned} unassigned
          </Badge>
        )}
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
