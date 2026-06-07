import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const PAGE_SIZE = 100;

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

function pickUrl(details: Record<string, unknown>): string | null {
  const direct = details?.url ?? details?.page_url ?? details?.request_url;
  if (typeof direct === "string") return direct;
  return null;
}

function pickStack(details: Record<string, unknown>): string | null {
  const err = details?.error;
  if (err && typeof err === "object" && "stack" in (err as object)) {
    const s = (err as { stack?: unknown }).stack;
    if (typeof s === "string") return s;
  }
  if (typeof details?.stack === "string") return details.stack as string;
  return null;
}

function AdminAlerts() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"unack" | "all">("unack");
  const [eventFilter, setEventFilter] = useState<string>("__all");
  const [severityFilter, setSeverityFilter] = useState<string>("__all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [urlQuery, setUrlQuery] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    let q = supabase
      .from("ops_alerts" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (status === "unack") q = q.eq("acknowledged", false);
    if (eventFilter !== "__all") q = q.eq("event", eventFilter);
    if (severityFilter !== "__all") q = q.eq("severity", severityFilter);
    if (fromDate) q = q.gte("created_at", new Date(fromDate).toISOString());
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    let result = (data as unknown as Alert[]) ?? [];
    // Client-side URL substring filter (details is jsonb; pattern matching is easier here)
    const needle = urlQuery.trim().toLowerCase();
    if (needle) {
      result = result.filter((r) => {
        const u = pickUrl(r.details ?? {});
        return u ? u.toLowerCase().includes(needle) : false;
      });
    }
    setRows(result);
    setLoading(false);
  }

  function matchesFilters(a: Alert): boolean {
    if (status === "unack" && a.acknowledged) return false;
    if (eventFilter !== "__all" && a.event !== eventFilter) return false;
    if (severityFilter !== "__all" && a.severity !== severityFilter) return false;
    if (fromDate && new Date(a.created_at) < new Date(fromDate)) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(a.created_at) > end) return false;
    }
    const needle = urlQuery.trim().toLowerCase();
    if (needle) {
      const u = pickUrl(a.details ?? {});
      if (!u || !u.toLowerCase().includes(needle)) return false;
    }
    return true;
  }

  function upsertRow(incoming: Alert) {
    if (!matchesFilters(incoming)) {
      // Row no longer matches (e.g. just acknowledged while filter is "unack") — drop it
      setRows((prev) => prev.filter((r) => r.id !== incoming.id));
      return;
    }
    setRows((prev) => {
      const without = prev.filter((r) => r.id !== incoming.id);
      const next = [incoming, ...without];
      // Sort newest-first by created_at; stable tiebreak on id so equal timestamps
      // never re-order between renders.
      next.sort((a, b) => {
        const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return d !== 0 ? d : a.id.localeCompare(b.id);
      });
      return next.slice(0, PAGE_SIZE);
    });
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    const ch = supabase
      .channel("ops_alerts_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ops_alerts" },
        (payload) => upsertRow(payload.new as unknown as Alert),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ops_alerts" },
        (payload) => upsertRow(payload.new as unknown as Alert),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "ops_alerts" },
        (payload) => {
          const id = (payload.old as { id?: string } | null)?.id;
          if (id) removeRow(id);
        },
      )
      .subscribe();
    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, eventFilter, severityFilter, fromDate, toDate, urlQuery]);

  // Re-run filtering when URL query changes (no DB round-trip needed)
  useEffect(() => {
    if (!loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  const unackCount = useMemo(() => rows.filter((r) => !r.acknowledged).length, [rows]);

  // Distinct event types from currently-loaded rows + a few baseline known ones
  const [eventOptions, setEventOptions] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ops_alerts" as never)
        .select("event")
        .order("created_at", { ascending: false })
        .limit(500);
      const list = ((data as unknown as { event: string }[]) ?? []).map((r) => r.event);
      setEventOptions(Array.from(new Set(list)).sort());
    })();
  }, []);

  function resetFilters() {
    setEventFilter("__all");
    setSeverityFilter("__all");
    setFromDate("");
    setToDate("");
    setUrlQuery("");
  }

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

  const hasActiveFilters =
    eventFilter !== "__all" ||
    severityFilter !== "__all" ||
    fromDate ||
    toDate ||
    urlQuery.trim();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Ops Alerts &amp; Errors
          </h1>
          <p className="text-sm text-muted-foreground">
            Backend failures (SSR errors, payment webhooks, email, geocoding, etc.). Investigate, then acknowledge.
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
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh alerts">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          {unackCount > 0 && (
            <Button onClick={acknowledgeAll}>
              <Check className="mr-2 h-4 w-4" />
              Ack all ({unackCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-5">
        <div>
          <Label className="mb-1 block text-xs">Event type</Label>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All events</SelectItem>
              {eventOptions.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs">Severity</Label>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs">From</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">To</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Page URL contains</Label>
          <div className="flex gap-1">
            <Input
              placeholder="/shop, webhook, …"
              value={urlQuery}
              onChange={(e) => setUrlQuery(e.target.value)}
            />
            {hasActiveFilters && (
              <Button variant="outline" size="icon" onClick={resetFilters} aria-label="Clear filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
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
            {hasActiveFilters ? "No alerts match the current filters." : status === "unack" ? "No unacknowledged alerts." : "No alerts in the recent window."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Showing {rows.length} alert{rows.length === 1 ? "" : "s"}
          </div>
          {rows.map((a) => {
            const open = !!expanded[a.id];
            const url = pickUrl(a.details ?? {});
            const stack = pickStack(a.details ?? {});
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
                      <button
                        type="button"
                        onClick={() => setEventFilter(a.event)}
                        className="font-mono text-sm font-medium underline-offset-2 hover:underline"
                        title="Filter by this event"
                      >
                        {a.event}
                      </button>
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
                    {url && (
                      <div className="mt-1 truncate font-mono text-xs text-muted-foreground" title={url}>
                        {url}
                      </div>
                    )}
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
                  <div className="mt-3 space-y-2">
                    {stack && (
                      <div>
                        <div className="mb-1 text-xs font-semibold text-muted-foreground">Stack trace</div>
                        <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                          {stack}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="mb-1 text-xs font-semibold text-muted-foreground">Full details</div>
                      <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                        {JSON.stringify(a.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
