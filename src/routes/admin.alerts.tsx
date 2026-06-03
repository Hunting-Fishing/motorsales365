import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/alerts")({
  component: AdminAlerts,
});

type Alert = {
  id: string;
  event: string;
  severity: "info" | "warning" | "error" | "critical";
  source: string | null;
  details: Record<string, unknown>;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

const PAGE_SIZE = 50;

function fmt(ts: string) {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function severityBadge(s: Alert["severity"]) {
  switch (s) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "warning":
      return (
        <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white">Warning</Badge>
      );
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
}

function AdminAlerts() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"unack" | "all">("unack");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    let q = supabase
      .from("ops_alerts" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (status === "unack") q = q.eq("acknowledged", false);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as unknown as Alert[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // realtime would be nice but polling is fine for ops view
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const unackCount = useMemo(() => rows.filter((r) => !r.acknowledged).length, [rows]);

  async function acknowledge(id: string) {
    const { error } = await supabase
      .from("ops_alerts" as never)
      .update({
        acknowledged: true,
        acknowledged_by: user?.id ?? null,
        acknowledged_at: new Date().toISOString(),
      } as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Acknowledged");
    load();
  }

  async function acknowledgeAll() {
    const ids = rows.filter((r) => !r.acknowledged).map((r) => r.id);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("ops_alerts" as never)
      .update({
        acknowledged: true,
        acknowledged_by: user?.id ?? null,
        acknowledged_at: new Date().toISOString(),
      } as never)
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Acknowledged ${ids.length} alert${ids.length === 1 ? "" : "s"}`);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Ops Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            Backend failures (payment webhooks, email, geocoding, etc.) live here. Investigate, then acknowledge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unack">Unacknowledged</SelectItem>
              <SelectItem value="all">All recent</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {unackCount > 0 && (
            <Button onClick={acknowledgeAll}>
              <Check className="mr-2 h-4 w-4" />
              Ack all ({unackCount})
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Check className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          <div className="font-medium">All clear</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "unack" ? "No unacknowledged alerts." : "No alerts in the recent window."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => {
            const open = !!expanded[a.id];
            return (
              <div
                key={a.id}
                className={`rounded-lg border bg-card p-4 ${a.acknowledged ? "border-border opacity-70" : "border-amber-500/40"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {severityBadge(a.severity)}
                      {a.source && <Badge variant="outline">{a.source}</Badge>}
                      <span className="font-mono text-sm font-medium">{a.event}</span>
                      {a.acknowledged && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" /> Acknowledged
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fmt(a.created_at)}
                      {a.acknowledged_at && ` · ack ${fmt(a.acknowledged_at)}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpanded((p) => ({ ...p, [a.id]: !open }))}
                    >
                      {open ? "Hide" : "Details"}
                    </Button>
                    {!a.acknowledged && (
                      <Button size="sm" onClick={() => acknowledge(a.id)}>
                        <Check className="mr-1 h-4 w-4" />
                        Ack
                      </Button>
                    )}
                  </div>
                </div>
                {open && (
                  <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(a.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
