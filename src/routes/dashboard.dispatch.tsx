import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Network, Settings2, Timer, Truck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { REGION_OPTIONS } from "@/lib/psgc";
import {
  acceptDispatchedJob,
  declineDispatchedJob,
  getMyDispatchStatus,
  updateDispatchSettings,
} from "@/lib/dispatch.functions";

export const Route = createFileRoute("/dashboard/dispatch")({
  head: () => ({
    meta: [
      { title: "365 Dispatch — Live Queue" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DispatchDashboard,
});

type DispatchedJob = {
  id: string;
  vehicle_summary: string;
  pickup_region: string | null;
  pickup_province: string | null;
  pickup_city: string | null;
  pickup_address: string | null;
  dropoff_city: string | null;
  notes: string | null;
  dispatch_status: string;
  dispatch_window_ends_at: string | null;
  created_at: string;
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  dispatch_solo: { label: "Solo (₱250/mo)", color: "bg-secondary" },
  dispatch_team: { label: "Team (₱500/mo)", color: "bg-primary text-primary-foreground" },
  dispatch_unlimited: { label: "Unlimited (₱1,000/mo)", color: "bg-amber-500 text-white" },
  // legacy
  dispatch_starter: { label: "Starter (legacy)", color: "bg-secondary" },
  dispatch_pro: { label: "Pro (legacy)", color: "bg-primary text-primary-foreground" },
  dispatch_fleet: { label: "Fleet (legacy)", color: "bg-amber-500 text-white" },
};

function DispatchDashboard() {
  const { user, loading } = useAuth();
  const acceptFn = useServerFn(acceptDispatchedJob);
  const declineFn = useServerFn(declineDispatchedJob);
  const settingsFn = useServerFn(updateDispatchSettings);
  const statusFn = useServerFn(getMyDispatchStatus);

  const [jobs, setJobs] = useState<DispatchedJob[]>([]);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getMyDispatchStatus>> | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());

  const loadJobs = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("tow_requests")
      .select(
        "id,vehicle_summary,pickup_region,pickup_province,pickup_city,pickup_address,dropoff_city,notes,dispatch_status,dispatch_window_ends_at,created_at",
      )
      .contains("matched_provider_ids", [user.id])
      .eq("status", "open")
      .in("dispatch_status", ["matched", "direct"])
      .order("created_at", { ascending: false });
    setJobs((data ?? []) as DispatchedJob[]);
  };

  const loadStatus = async () => {
    const s = await statusFn();
    setStatus(s);
    setEnabled(s.enabled);
    setRegions(s.regions);
  };

  useEffect(() => {
    if (!user) return;
    void loadJobs();
    void loadStatus();
    const ch = supabase
      .channel(`dispatch-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tow_requests" },
        () => void loadJobs(),
      )
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      void loadJobs();
      void loadStatus();
    }, 30000);
    return () => {
      void supabase.removeChannel(ch);
      clearInterval(tick);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAccept = async (id: string) => {
    const res = await acceptFn({ data: { requestId: id } });
    if (res.ok) {
      toast.success("Job accepted — head out!");
      void loadJobs();
    } else {
      toast.error(res.reason || "Could not accept");
      void loadJobs();
    }
  };

  const handleDecline = async (id: string) => {
    await declineFn({ data: { requestId: id } });
    toast.message("Declined");
    void loadJobs();
  };

  const saveSettings = async () => {
    await settingsFn({ data: { enabled, regions } });
    toast.success("Dispatch settings saved");
    void loadStatus();
  };

  const toggleRegion = (r: string) => {
    setRegions((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const plan = status?.subscription?.plan_slug ?? null;
  const planMeta = plan ? PLAN_LABELS[plan] : null;
  const maxRegions =
    plan === "dispatch_unlimited" || plan === "dispatch_fleet"
      ? 99
      : plan === "dispatch_team" || plan === "dispatch_pro"
      ? 3
      : plan === "dispatch_solo" || plan === "dispatch_starter"
      ? 1
      : 0;

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">365 Dispatch</h1>
          <p className="text-sm text-muted-foreground">
            Auto-matched emergency tow jobs in your coverage area.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/dispatch/history">Job history</Link>
          </Button>
          {planMeta ? (
            <Badge className={planMeta.color}>{planMeta.label}</Badge>
          ) : (
            <Button asChild size="sm">
              <Link to="/dispatch" hash="plans">
                <Network className="mr-2 h-4 w-4" /> Subscribe to Dispatch
              </Link>
            </Button>
          )}
        </div>
      </header>

      {!plan && (
        <Card className="border-amber-400/40 bg-amber-50/40 p-4 text-sm dark:bg-amber-950/20">
          You need an active Dispatch subscription to receive auto-matched jobs.{" "}
          <Link to="/dispatch" hash="plans" className="underline">
            View plans
          </Link>
          .
        </Card>
      )}

      {/* Settings */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> <h2 className="font-semibold">Coverage settings</h2>
        </div>
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <div>
            <Label className="text-sm">Receive dispatched jobs</Label>
            <p className="text-xs text-muted-foreground">
              Turn off to pause auto-matching (existing accepted jobs are unaffected).
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!plan} />
        </div>
        <div className="mt-3">
          <Label className="text-sm">
            Regions you cover {maxRegions ? `(max ${maxRegions === 99 ? "all" : maxRegions})` : ""}
          </Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {REGION_OPTIONS.map((r) => {
              const active = regions.includes(r.value);
              const disabled = !plan || (!active && regions.length >= maxRegions);
              return (
                <button
                  key={r.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleRegion(r.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-secondary"
                  } ${disabled && !active ? "opacity-40" : ""}`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
          {(plan === "dispatch_unlimited" || plan === "dispatch_fleet") && (
            <p className="mt-2 text-xs text-muted-foreground">
              Unlimited plan covers nationwide automatically — region selection is optional.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveSettings} disabled={!plan}>
            Save settings
          </Button>
        </div>
      </Card>

      {/* Queue */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <h2 className="font-semibold">Live queue</h2>
            <Badge variant="secondary">{jobs.length}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">Refreshes in real time</span>
        </div>
        {jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No matched jobs right now. New requests will appear here instantly.
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((j) => {
              const secondsLeft = j.dispatch_window_ends_at
                ? Math.max(0, Math.floor((new Date(j.dispatch_window_ends_at).getTime() - now) / 1000))
                : null;
              return (
                <li key={j.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{j.vehicle_summary}</span>
                        {j.dispatch_status === "direct" && (
                          <Badge className="bg-primary text-primary-foreground">Direct request</Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">
                          {[j.pickup_address, j.pickup_city, j.pickup_province].filter(Boolean).join(", ")}
                          {j.dropoff_city && <> → {j.dropoff_city}</>}
                        </span>
                      </div>
                      {j.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{j.notes}</p>
                      )}
                    </div>
                    {secondsLeft !== null && (
                      <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
                        <Timer className="h-3.5 w-3.5" />
                        {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} left
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => handleAccept(j.id)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDecline(j.id)}>
                      <XCircle className="mr-1 h-4 w-4" /> Pass
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
