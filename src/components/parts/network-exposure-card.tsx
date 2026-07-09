import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Radio, History, ShieldCheck, ShieldAlert, Clock, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getBusinessNetworkExposure,
  setBusinessNetworkExposure,
  listNetworkExposureAudit,
  type NetworkExposureStatus,
} from "@/lib/network-stock.functions";

const STATUS_LABEL: Record<NetworkExposureStatus, string> = {
  none: "Not requested",
  pending: "Awaiting admin approval",
  approved: "Approved",
  revoked: "Revoked by admin",
};

const STATUS_ICON: Record<NetworkExposureStatus, ReactNode> = {
  none: <Radio className="h-3.5 w-3.5" />,
  pending: <Clock className="h-3.5 w-3.5" />,
  approved: <ShieldCheck className="h-3.5 w-3.5" />,
  revoked: <Ban className="h-3.5 w-3.5" />,
};

const STATUS_VARIANT: Record<NetworkExposureStatus, "secondary" | "outline" | "default" | "destructive"> = {
  none: "outline",
  pending: "secondary",
  approved: "default",
  revoked: "destructive",
};

const ACTION_LABEL: Record<string, string> = {
  requested: "Sharing requested",
  reapplied: "Re-applied for approval",
  approved: "Approved by admin",
  rejected: "Rejected by admin",
  revoked: "Revoked by admin",
  owner_enabled: "Sharing turned on",
  owner_disabled: "Sharing turned off",
};

export function NetworkExposureCard({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const loadFn = useServerFn(getBusinessNetworkExposure);
  const setFn = useServerFn(setBusinessNetworkExposure);
  const auditFn = useServerFn(listNetworkExposureAudit);
  const [showAudit, setShowAudit] = useState(false);

  const exposure = useQuery({
    queryKey: ["business-exposure", businessId],
    queryFn: () => loadFn({ data: { businessId } }),
  });

  const audit = useQuery({
    queryKey: ["business-exposure-audit", businessId],
    queryFn: () => auditFn({ data: { businessId } }),
    enabled: showAudit,
  });

  const state = exposure.data;
  const status: NetworkExposureStatus = state?.status ?? "none";
  const expose = !!state?.expose;
  const liveOnNetwork = expose && status === "approved";

  async function onToggle(next: boolean) {
    try {
      const res = await setFn({ data: { businessId, expose: next } });
      qc.invalidateQueries({ queryKey: ["business-exposure", businessId] });
      qc.invalidateQueries({ queryKey: ["business-exposure-audit", businessId] });
      if (next && res.status === "pending") {
        toast.success("Request submitted — an admin will review shortly.");
      } else if (next && res.status === "approved") {
        toast.success("Sharing is live on the network.");
      } else {
        toast.success("Network sharing turned off.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" /> Share stock with the 365 network
            </p>
            <Badge variant={STATUS_VARIANT[status]} className="gap-1">
              {STATUS_ICON[status]} {STATUS_LABEL[status]}
            </Badge>
            {liveOnNetwork && (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                Live
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Turning this on submits a request for admin review. Once approved, your live in-stock
            items, quantities, and price appear at <span className="font-mono">/parts/network</span>{" "}
            and customers can send requests in one click. Cost, location, and internal notes are
            never exposed. Admins can revoke access at any time.
          </p>
          {status === "revoked" && state?.review_note && (
            <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
              <ShieldAlert className="inline h-3.5 w-3.5 mr-1" />
              Admin note: {state.review_note}
            </p>
          )}
          {status === "pending" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Requested {state?.requested_at ? new Date(state.requested_at).toLocaleString() : ""}
            </p>
          )}
        </div>
        <Switch
          checked={expose}
          onCheckedChange={onToggle}
          disabled={exposure.isLoading}
          aria-label="Toggle network stock sharing"
        />
      </div>

      <div className="border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAudit((v) => !v)}
          className="h-7 px-2"
        >
          <History className="h-3.5 w-3.5 mr-1" />
          {showAudit ? "Hide audit history" : "View audit history"}
        </Button>
        {showAudit && (
          <div className="mt-2 space-y-1 text-sm">
            {audit.isLoading && <p className="text-muted-foreground">Loading…</p>}
            {audit.data && audit.data.length === 0 && (
              <p className="text-muted-foreground">No activity yet.</p>
            )}
            {audit.data?.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 border-l-2 pl-3 py-1">
                <div className="min-w-0">
                  <p className="font-medium">{ACTION_LABEL[row.action] ?? row.action}</p>
                  {row.note && (
                    <p className="text-muted-foreground text-xs">{row.note}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {row.previous_status ?? "—"} → {row.new_status ?? "—"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
