import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Smartphone, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  adminCheckStripeGCash,
  adminToggleStripeGCash,
  type GCashStatus,
} from "@/lib/admin-gcash.functions";

type Env = "sandbox" | "live";

function StatusRow({ env, status, onChange }: { env: Env; status: GCashStatus | null; onChange: () => void }) {
  const toggle = useServerFn(adminToggleStripeGCash);
  const [busy, setBusy] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      const res = await toggle({ data: { environment: env, enabled } });
      if ("error" in res) {
        toast.error(res.error);
      } else {
        toast.success(`GCash ${enabled ? "enabled" : "disabled"} on Stripe ${env}.`);
        onChange();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="text-sm">
          <div className="font-medium capitalize">Stripe {env}</div>
          <div className="text-xs text-muted-foreground">Loading…</div>
        </div>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 font-medium capitalize">
          Stripe {env}
          {status.error ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> Error
            </Badge>
          ) : status.gcashEnabled ? (
            <Badge className="gap-1 bg-primary/15 text-primary border-primary/30">
              <CheckCircle2 className="h-3 w-3" /> GCash on
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              GCash off
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {status.error
            ? status.error
            : status.configurationName
              ? `Config: ${status.configurationName}`
              : status.configurationId
                ? `Config: ${status.configurationId}`
                : "No payment method configuration found."}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status.configured && !status.error && (
          <Switch
            checked={status.gcashEnabled}
            disabled={busy}
            onCheckedChange={handleToggle}
            aria-label={`Toggle GCash on Stripe ${env}`}
          />
        )}
      </div>
    </div>
  );
}

export function StripeGCashAdminPanel() {
  const check = useServerFn(adminCheckStripeGCash);
  const [sandbox, setSandbox] = useState<GCashStatus | null>(null);
  const [live, setLive] = useState<GCashStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        check({ data: { environment: "sandbox" } }).catch((e) => ({
          environment: "sandbox" as const,
          configured: false,
          configurationId: null,
          configurationName: null,
          gcashEnabled: false,
          gcashPreference: null,
          error: e?.message ?? "Failed",
        })),
        check({ data: { environment: "live" } }).catch((e) => ({
          environment: "live" as const,
          configured: false,
          configurationId: null,
          configurationName: null,
          gcashEnabled: false,
          gcashPreference: null,
          error: e?.message ?? "Failed",
        })),
      ]);
      setSandbox(s);
      setLive(l);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-semibold">Stripe GCash</div>
              <p className="text-xs text-muted-foreground">
                Turn the native GCash rail on/off in your Stripe payment method configuration. Buyers see GCash inside Stripe Checkout when on.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Refresh
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <StatusRow env="sandbox" status={sandbox} onChange={refresh} />
          <StatusRow env="live" status={live} onChange={refresh} />
        </div>
      </CardContent>
    </Card>
  );
}
