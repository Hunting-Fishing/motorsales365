import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminListNetworkExposure,
  adminReviewNetworkExposure,
  adminListNetworkExposureAudit,
  type AdminNetworkExposureRow,
  type NetworkExposureStatus,
} from "@/lib/network-stock.functions";
import { CheckCircle2, XCircle, Ban, ShieldCheck, Clock, History } from "lucide-react";

export const Route = createFileRoute("/admin/network-exposure")({
  head: () => ({
    meta: [
      { title: "Network Exposure — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminNetworkExposurePage,
});

const TABS: { value: NetworkExposureStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "revoked", label: "Revoked" },
  { value: "none", label: "Not requested" },
  { value: "all", label: "All" },
];

const STATUS_META: Record<
  NetworkExposureStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  none: { label: "Not requested", variant: "outline" },
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  revoked: { label: "Revoked", variant: "destructive" },
};

const ACTION_LABEL: Record<string, string> = {
  requested: "Sharing requested",
  reapplied: "Re-applied for approval",
  approved: "Approved by admin",
  rejected: "Rejected by admin",
  revoked: "Revoked by admin",
  owner_enabled: "Owner enabled",
  owner_disabled: "Owner disabled",
};

function AdminNetworkExposurePage() {
  const listFn = useServerFn(adminListNetworkExposure);
  const reviewFn = useServerFn(adminReviewNetworkExposure);
  const auditFn = useServerFn(adminListNetworkExposureAudit);
  const qc = useQueryClient();

  const [status, setStatus] = useState<(typeof TABS)[number]["value"]>("pending");
  const [search, setSearch] = useState("");
  const [openRow, setOpenRow] = useState<AdminNetworkExposureRow | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["admin", "network-exposure", status, search],
    queryFn: () => listFn({ data: { status, search: search || null } }),
  });

  const audit = useQuery({
    queryKey: ["admin", "network-exposure", "audit", openRow?.id],
    queryFn: () =>
      openRow ? auditFn({ data: { businessId: openRow.id } }) : Promise.resolve([]),
    enabled: !!openRow,
  });

  async function decide(decision: "approve" | "reject" | "revoke") {
    if (!openRow) return;
    setBusy(true);
    try {
      await reviewFn({ data: { businessId: openRow.id, decision, note: note || null } });
      toast.success(
        decision === "approve"
          ? "Approved — shop is now live on the network."
          : decision === "reject"
          ? "Rejected — request cleared."
          : "Revoked — shop hidden from network.",
      );
      setNote("");
      setOpenRow(null);
      qc.invalidateQueries({ queryKey: ["admin", "network-exposure"] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  const rows = list.data ?? [];

  return (
    <SiteLayout>
      <div className="container max-w-6xl py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Network exposure approvals
          </h1>
          <p className="text-sm text-muted-foreground">
            Approve, reject, or revoke businesses that want their live inventory shown on{" "}
            <span className="font-mono">/parts/network</span>. Every action is logged.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Card className="divide-y">
          {list.isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
          {!list.isLoading && rows.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No businesses in this bucket.</div>
          )}
          {rows.map((r) => {
            const meta = STATUS_META[r.network_exposure_status];
            return (
              <button
                key={r.id}
                onClick={() => {
                  setOpenRow(r);
                  setNote("");
                }}
                className="w-full text-left p-4 hover:bg-muted/40 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    /{r.slug} · {[r.city, r.province].filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.expose_inventory_to_network && (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                      Opt-in on
                    </Badge>
                  )}
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  {r.network_exposure_requested_at && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(r.network_exposure_requested_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </Card>
      </div>

      <Sheet open={!!openRow} onOpenChange={(v) => !v && setOpenRow(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {openRow && (
            <>
              <SheetHeader>
                <SheetTitle>{openRow.name}</SheetTitle>
                <SheetDescription>
                  Current status:{" "}
                  <Badge variant={STATUS_META[openRow.network_exposure_status].variant}>
                    {STATUS_META[openRow.network_exposure_status].label}
                  </Badge>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Requested</p>
                    <p>
                      {openRow.network_exposure_requested_at
                        ? new Date(openRow.network_exposure_requested_at).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last reviewed</p>
                    <p>
                      {openRow.network_exposure_reviewed_at
                        ? new Date(openRow.network_exposure_reviewed_at).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>
                {openRow.network_exposure_review_note && (
                  <div className="rounded-md border p-2 text-xs">
                    <p className="text-muted-foreground">Last review note</p>
                    <p>{openRow.network_exposure_review_note}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Decision note (optional)</label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Reason shown to the shop owner…"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => decide("approve")}
                    disabled={busy || openRow.network_exposure_status === "approved"}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => decide("reject")}
                    disabled={busy || openRow.network_exposure_status !== "pending"}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => decide("revoke")}
                    disabled={busy || openRow.network_exposure_status !== "approved"}
                  >
                    <Ban className="h-4 w-4 mr-1" /> Revoke
                  </Button>
                </div>

                <div className="border-t pt-3">
                  <p className="font-medium flex items-center gap-2">
                    <History className="h-4 w-4" /> Audit history
                  </p>
                  <div className="mt-2 space-y-1">
                    {audit.isLoading && <p className="text-muted-foreground">Loading…</p>}
                    {audit.data && audit.data.length === 0 && (
                      <p className="text-muted-foreground">No activity yet.</p>
                    )}
                    {audit.data?.map((row) => (
                      <div
                        key={row.id}
                        className="border-l-2 pl-3 py-1 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {ACTION_LABEL[row.action] ?? row.action}
                          </p>
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
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </SiteLayout>
  );
}
