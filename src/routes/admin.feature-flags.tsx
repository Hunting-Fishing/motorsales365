import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import {
  listFeatureFlags,
  setFeatureFlag,
  type FeatureFlag,
} from "@/lib/feature-flags.functions";

export const Route = createFileRoute("/admin/feature-flags")({
  component: AdminFeatureFlags,
  errorComponent: RouteError,
  notFoundComponent: () => <RouteNotFound />,
  head: () => ({
    meta: [
      { title: "Feature flags — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminFeatureFlags() {
  const listFn = useServerFn(listFeatureFlags);
  const setFn = useServerFn(setFeatureFlag);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags", "admin"],
    queryFn: () => listFn(),
  });
  const [busy, setBusy] = useState<string | null>(null);

  const onToggle = async (flag: FeatureFlag, next: boolean) => {
    setBusy(flag.key);
    try {
      await setFn({ data: { key: flag.key, enabled: next } });
      toast.success(`${flag.key} → ${next ? "enabled" : "disabled"}`);
      await qc.invalidateQueries({ queryKey: ["feature-flags"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update flag");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Feature flags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          In-house toggles for payment rails, boost types, and subscription plans.
          Changes apply within 60 seconds on user sessions.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid gap-3">
        {(data?.flags ?? []).map((flag) => (
          <Card key={flag.key} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-sm font-medium text-foreground">{flag.key}</code>
                <Badge variant={flag.enabled ? "default" : "secondary"}>
                  {flag.enabled ? "On" : "Off"}
                </Badge>
              </div>
              {flag.description && (
                <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {new Date(flag.updated_at).toLocaleString()}
              </p>
            </div>
            <Switch
              checked={flag.enabled}
              disabled={busy === flag.key}
              onCheckedChange={(v) => onToggle(flag, v)}
              aria-label={`Toggle ${flag.key}`}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
