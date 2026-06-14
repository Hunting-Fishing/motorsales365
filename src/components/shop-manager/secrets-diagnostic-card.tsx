import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  diagnoseShopManagerSecrets,
  type ShopManagerDiagnosticResult,
} from "@/lib/shop-manager.functions";
import { toast } from "sonner";

function Icon({ level }: { level: "ok" | "warn" | "error" }) {
  if (level === "ok") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (level === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
}

export function ShopManagerSecretsDiagnosticCard() {
  const fn = useServerFn(diagnoseShopManagerSecrets);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShopManagerDiagnosticResult | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await fn();
      setResult(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-12 border-dashed p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Diagnostics (admin)</h3>
          <p className="text-sm text-muted-foreground">
            Verify the 3 Shop Manager secrets are configured correctly. Read-only — no users
            created.
          </p>
        </div>
        <Button onClick={run} disabled={loading} size="sm">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Run check
        </Button>
      </div>
      {result && (
        <div className="mt-4 space-y-2 text-sm">
          {result.checks.map((c) => (
            <div key={c.name} className="flex items-start gap-2">
              <Icon level={c.level} />
              <div>
                <div className="font-mono text-xs">{c.name}</div>
                <div className="text-muted-foreground">{c.message}</div>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 border-t pt-2">
            <Icon level={result.partnerPing.ok ? "ok" : "error"} />
            <div>
              <div className="font-medium">Partner connection</div>
              <div className="text-muted-foreground">
                {result.partnerPing.message}
                {result.partnerPing.status ? ` (status ${result.partnerPing.status})` : ""}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
