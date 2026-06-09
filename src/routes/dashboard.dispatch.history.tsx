import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Frown,
  TimerOff,
  Ban,
  Inbox,
  History,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatPHP } from "@/lib/format";

export const Route = createFileRoute("/dashboard/dispatch/history")({
  head: () => ({
    meta: [
      { title: "Dispatch job history" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DispatchHistory,
});

type EventRow = {
  id: string;
  request_id: string;
  event: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  tow_requests: {
    id: string;
    vehicle_summary: string;
    pickup_city: string | null;
    pickup_province: string | null;
    pickup_region: string | null;
    dropoff_city: string | null;
    status: string;
    dispatch_status: string;
    created_at: string;
    picked_up_at: string | null;
    dropped_off_at: string | null;
    completed_at: string | null;
    final_price_php: number | null;
    provider_id: string | null;
  } | null;
};

const EVENT_META: Record<
  string,
  { label: string; icon: any; tone: string }
> = {
  matched: { label: "Matched", icon: Inbox, tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  declined: { label: "Declined", icon: XCircle, tone: "bg-muted text-muted-foreground" },
  lost: { label: "Lost to another", icon: Frown, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  timed_out: {
    label: "Timed out",
    icon: TimerOff,
    tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  completed: {
    label: "Completed",
    icon: Trophy,
    tone: "bg-emerald-600 text-white",
  },
  cancelled: { label: "Cancelled", icon: Ban, tone: "bg-muted text-muted-foreground" },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "timed_out", label: "Timed out" },
  { key: "lost", label: "Lost" },
] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DispatchHistory() {
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      const { data, error } = await (supabase as any)
        .from("dispatch_job_events")
        .select(
          `id, request_id, event, created_at, metadata,
           tow_requests:request_id (
             id, vehicle_summary,
             pickup_city, pickup_province, pickup_region, dropoff_city,
             status, dispatch_status, created_at, picked_up_at, dropped_off_at, completed_at,
             final_price_php, provider_id
           )`,
        )
        .eq("provider_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) console.error("[history] load error:", error);
      setEvents((data ?? []) as EventRow[]);
      setLoadingData(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    const c = { matched: 0, accepted: 0, declined: 0, lost: 0, timed_out: 0, completed: 0 };
    for (const e of events) if (e.event in c) (c as any)[e.event]++;
    const total = c.matched || 1;
    const acceptRate = Math.round(((c.accepted + c.completed) / total) * 100);
    return { ...c, acceptRate };
  }, [events]);

  const filtered = useMemo(
    () => (tab === "all" ? events : events.filter((e) => e.event === tab)),
    [events, tab],
  );

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            <History className="mr-2 inline h-6 w-6" />
            Dispatch job history
          </h1>
          <p className="text-sm text-muted-foreground">
            Every tow request you've been matched to, including accepted, declined, lost, and timed-out jobs.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard/dispatch">Back to live queue</Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          { label: "Matched", value: stats.matched, tone: "text-blue-600" },
          { label: "Accepted", value: stats.accepted, tone: "text-emerald-600" },
          { label: "Completed", value: stats.completed, tone: "text-emerald-700" },
          { label: "Declined", value: stats.declined, tone: "text-muted-foreground" },
          { label: "Timed out", value: stats.timed_out, tone: "text-rose-600" },
          { label: "Accept rate", value: `${stats.acceptRate}%`, tone: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-bold ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loadingData ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Loading history…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No {tab === "all" ? "" : EVENT_META[tab]?.label.toLowerCase() ?? ""} events yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((e) => {
                const meta = EVENT_META[e.event] ?? {
                  label: e.event,
                  icon: Clock,
                  tone: "bg-muted",
                };
                const Icon = meta.icon;
                const req = e.tow_requests;
                const loc = req
                  ? [req.pickup_city, req.pickup_province].filter(Boolean).join(", ")
                  : "";
                return (
                  <li key={e.id} className="rounded-lg border bg-card p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={meta.tone}>
                            <Icon className="mr-1 h-3 w-3" /> {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</span>
                        </div>
                        <div className="mt-1 font-medium">
                          {req?.vehicle_summary ?? "(request unavailable)"}
                        </div>
                        {loc && (
                          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>
                              {loc}
                              {req?.dropoff_city && <> → {req.dropoff_city}</>}
                            </span>
                          </div>
                        )}
                        {req && (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Requested {fmtDate(req.created_at)}</span>
                            {req.picked_up_at && <span>Picked up {fmtDate(req.picked_up_at)}</span>}
                            {req.dropped_off_at && <span>Dropped {fmtDate(req.dropped_off_at)}</span>}
                            {req.completed_at && <span>Completed {fmtDate(req.completed_at)}</span>}
                            {req.final_price_php != null && (
                              <span className="font-semibold text-foreground">
                                {formatPHP(Number(req.final_price_php))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
