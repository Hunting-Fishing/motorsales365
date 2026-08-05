import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, Loader2, AlertTriangle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/automation/logs")({
  head: () => ({ meta: [{ title: "Automation Logs — Shop Manager" }, { name: "robots", content: "noindex" }] }),
  component: AutomationLogsPage,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Automation Logs</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => <SiteLayout><div className="p-10">Not found</div></SiteLayout>,
});

async function fetchLogs() {
  const [{ data: logs }, { data: rules }] = await Promise.all([
    (smSupabase as any).from("automation_run_logs").select("*").order("ran_at", { ascending: false }).limit(500),
    (smSupabase as any).from("service_automation_rules").select("id,rule_name,service_type,is_active"),
  ]);
  return { logs: logs ?? [], rules: rules ?? [] };
}

function AutomationLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "automation_run_logs"],
    queryFn: fetchLogs,
    refetchInterval: 30_000,
  });

  const rules = data?.rules ?? [];
  const logs = data?.logs ?? [];

  const runsByDay = new Map<string, { runs: number; created: number; errors: number }>();
  for (const l of logs) {
    const k = String(l.ran_at ?? "").slice(0, 10);
    const row = runsByDay.get(k) ?? { runs: 0, created: 0, errors: 0 };
    row.runs++;
    row.created += Number(l.reminders_created ?? 0);
    if (l.error) row.errors++;
    runsByDay.set(k, row);
  }
  const dayRows = Array.from(runsByDay.entries()).slice(0, 7);

  const ruleName = (id: string | null) => rules.find((r: any) => r.id === id)?.rule_name ?? "—";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4">
          <Link to="/shop/automation" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Automation
          </Link>
        </div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Bot className="h-6 w-6" /> Automation Logs</h1>
            <p className="text-sm text-muted-foreground">Cron runs that scan vehicles and create service reminders.</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{rules.filter((r: any) => r.is_active).length} active rule(s)</div>
            <div>{logs.length} log entries</div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {dayRows.slice(0, 3).map(([day, r]) => (
                <Card key={day}>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">{day}</div>
                    <div className="text-xl font-bold">{r.created} reminders</div>
                    <div className="text-xs text-muted-foreground">{r.runs} rule-runs {r.errors ? `· ${r.errors} errors` : ""}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader>
              <CardContent className="p-0">
                {logs.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    No automation runs yet. The cron endpoint writes here every scheduled run.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead className="text-right">Customers</TableHead>
                        <TableHead className="text-right">Vehicles</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                        <TableHead className="text-right">Skipped</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((l: any) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs whitespace-nowrap">{new Date(l.ran_at).toLocaleString()}</TableCell>
                          <TableCell className="text-xs">{ruleName(l.rule_id)}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">{l.customers_scanned}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">{l.vehicles_scanned}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs font-medium">{l.reminders_created}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs text-muted-foreground">{l.skipped_duplicate}</TableCell>
                          <TableCell>
                            {l.error ? (
                              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {l.error.slice(0, 40)}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
