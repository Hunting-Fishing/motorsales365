import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, ExternalLink, Save } from "lucide-react";
import { formatPHP, formatDate } from "@/lib/format";
import {
  adminListAllMethods,
  adminUpdateMethod,
  adminListPendingPayments,
  adminApprovePayment,
  adminRejectPayment,
  adminListAllPayments,
  type ManualPaymentMethod,
} from "@/lib/payments-manual.functions";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Payments Control</h1>
        <p className="text-sm text-muted-foreground">
          Configure methods, review manual payments, and audit transactions.
        </p>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
          <TabsTrigger value="rails">Rails</TabsTrigger>
          <TabsTrigger value="all">All Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <PendingTab />
        </TabsContent>
        <TabsContent value="methods" className="mt-4">
          <MethodsTab />
        </TabsContent>
        <TabsContent value="rails" className="mt-4">
          <RailsTab />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <AllPaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendingTab() {
  const list = useServerFn(adminListPendingPayments);
  const approve = useServerFn(adminApprovePayment);
  const reject = useServerFn(adminRejectPayment);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await list());
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openProof = async (path: string) => {
    const { data } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleApprove = async (id: string) => {
    setBusy(id);
    try {
      await approve({ data: { id } });
      toast.success("Payment approved");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (id: string) => {
    const notes = window.prompt("Rejection reason (shown to buyer):");
    if (!notes) return;
    setBusy(id);
    try {
      await reject({ data: { id, notes } });
      toast.success("Payment rejected");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!rows.length)
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No pending manual payments.
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-3">
      {rows.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{p.invoice_number ?? p.id.slice(0, 8)}</span>
                  <Badge variant="outline">{p.kind}</Badge>
                  <Badge>{p.method}</Badge>
                </div>
                <div className="text-sm">
                  <span className="font-medium">
                    {p.profile?.business_name || p.profile?.full_name || "Unknown"}
                  </span>{" "}
                  · {formatPHP(Number(p.amount_php))}
                </div>
                {p.reference && (
                  <div className="text-xs text-muted-foreground">Ref: {p.reference}</div>
                )}
                {p.notes && (
                  <div className="text-xs text-muted-foreground">Notes: {p.notes}</div>
                )}
                <div className="text-xs text-muted-foreground">
                  Submitted {formatDate(p.created_at)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {p.proof_url && (
                  <Button size="sm" variant="outline" onClick={() => openProof(p.proof_url)}>
                    <ExternalLink className="mr-1 h-3 w-3" />
                    View proof
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === p.id}
                    onClick={() => handleReject(p.id)}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Reject
                  </Button>
                  <Button size="sm" disabled={busy === p.id} onClick={() => handleApprove(p.id)}>
                    {busy === p.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MethodsTab() {
  const list = useServerFn(adminListAllMethods);
  const update = useServerFn(adminUpdateMethod);
  const [methods, setMethods] = useState<ManualPaymentMethod[]>([]);
  const [dirty, setDirty] = useState<Record<string, Partial<ManualPaymentMethod>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    list().then(setMethods);
  }, [list]);

  const patch = (m: string, p: Partial<ManualPaymentMethod>) =>
    setDirty((d) => ({ ...d, [m]: { ...d[m], ...p } }));

  const save = async (m: string) => {
    const p = dirty[m];
    if (!p) return;
    setBusy(m);
    try {
      await update({ data: { method: m, patch: p } });
      toast.success("Saved");
      setMethods(await list());
      setDirty((d) => {
        const n = { ...d };
        delete n[m];
        return n;
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {methods.map((m) => {
        const d = dirty[m.method] ?? {};
        const v = { ...m, ...d };
        return (
          <Card key={m.method}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {v.label}{" "}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{m.method}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`en-${m.method}`} className="text-xs">
                    Enabled
                  </Label>
                  <Switch
                    id={`en-${m.method}`}
                    checked={!!v.enabled}
                    onCheckedChange={(c) => patch(m.method, { enabled: c })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Display label</Label>
                  <Input
                    value={v.label ?? ""}
                    onChange={(e) => patch(m.method, { label: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Sort order</Label>
                  <Input
                    type="number"
                    value={v.sort_order ?? 100}
                    onChange={(e) => patch(m.method, { sort_order: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Account name</Label>
                  <Input
                    value={v.account_name ?? ""}
                    onChange={(e) => patch(m.method, { account_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Account number</Label>
                  <Input
                    value={v.account_number ?? ""}
                    onChange={(e) => patch(m.method, { account_number: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">QR image URL</Label>
                  <Input
                    placeholder="https://…"
                    value={v.qr_image_url ?? ""}
                    onChange={(e) => patch(m.method, { qr_image_url: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Instructions (markdown)</Label>
                  <Textarea
                    rows={3}
                    value={v.instructions_md ?? ""}
                    onChange={(e) => patch(m.method, { instructions_md: e.target.value })}
                  />
                </div>
              </div>
              {dirty[m.method] && (
                <div className="flex justify-end">
                  <Button size="sm" disabled={busy === m.method} onClick={() => save(m.method)}>
                    {busy === m.method ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-3 w-3" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RailsTab() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("feature_flags")
      .select("key,enabled,description")
      .like("key", "payments.%")
      .order("key");
    setFlags(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (key: string, enabled: boolean) => {
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled })
      .eq("key", key);
    if (error) toast.error(error.message);
    else toast.success("Updated");
    await load();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">
          Toggle payment rails. Disabled rails are hidden from checkout pickers globally.
        </p>
        {flags.map((f) => (
          <div key={f.key} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-mono text-sm">{f.key}</div>
              {f.description && (
                <div className="text-xs text-muted-foreground">{f.description}</div>
              )}
            </div>
            <Switch
              checked={!!f.enabled}
              onCheckedChange={(c) => toggle(f.key, c)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AllPaymentsTab() {
  const list = useServerFn(adminListAllPayments);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await list({ data: { status: status || undefined, limit: 200 } }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {["", "pending", "paid", "failed", "refunded"].map((s) => (
            <Button
              key={s || "all"}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s || "All"}
            </Button>
          ))}
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Invoice</th>
                  <th>Kind</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 font-mono text-xs">
                      {r.invoice_number ?? r.id.slice(0, 8)}
                    </td>
                    <td>{r.kind}</td>
                    <td>{r.method ?? "—"}</td>
                    <td className="text-right">{formatPHP(Number(r.amount_php))}</td>
                    <td>
                      <Badge variant={r.status === "paid" ? "default" : "outline"}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                    <td>
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/payments/${r.id}/receipt`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
