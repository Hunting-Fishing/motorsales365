import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
import { Loader2, Save } from "lucide-react";
import { formatPHP, formatDate } from "@/lib/format";
import {
  adminListAllMethods,
  adminUpdateMethod,
  adminListPayments,
  type ManualPaymentMethod,
  type ReviewState,
} from "@/lib/payments-manual.functions";
import { PaymentReviewDrawer } from "@/components/admin/payment-review-drawer";
import { StripeGCashAdminPanel } from "@/components/admin/stripe-gcash-admin-panel";
import { Download, Smartphone } from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

const STATE_LABEL: Record<string, string> = {
  awaiting_review: "Pending",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  not_applicable: "Auto",
};
const STATE_VARIANT: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  awaiting_review: "secondary",
  in_review: "default",
  approved: "default",
  rejected: "destructive",
  not_applicable: "outline",
};

function AdminPayments() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Payments Control</h1>
        <p className="text-sm text-muted-foreground">
          Configure methods, review manual payments, and audit transactions.
        </p>
      </div>
      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
          <TabsTrigger value="rails">Rails</TabsTrigger>
          <TabsTrigger value="all">All Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-4">
          <QueueTab />
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

function QueueTab() {
  const list = useServerFn(adminListPayments);
  const [pending, setPending] = useState<any[]>([]);
  const [inReview, setInReview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [p, ir] = await Promise.all([
        list({ data: { review_state: "awaiting_review", limit: 200 } }),
        list({ data: { review_state: "in_review", limit: 200 } }),
      ]);
      setPending(p);
      setInReview(ir);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <Section title={`Pending (${pending.length})`} rows={pending} onOpen={setSelected} emptyText="No pending manual payments." />
      <Section title={`In review (${inReview.length})`} rows={inReview} onOpen={setSelected} emptyText="Nothing currently in review." showReviewer />
      <PaymentReviewDrawer
        paymentId={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onChanged={refresh}
      />
    </div>
  );
}

function Section({
  title,
  rows,
  onOpen,
  emptyText,
  showReviewer,
}: {
  title: string;
  rows: any[];
  onOpen: (id: string) => void;
  emptyText: string;
  showReviewer?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Card key={p.id} className="cursor-pointer transition hover:bg-accent/30" onClick={() => onOpen(p.id)}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">
                        {p.invoice_number ?? p.id.slice(0, 8)}
                      </span>
                      <Badge variant="outline">{p.kind}</Badge>
                      {p.method && <Badge>{p.method}</Badge>}
                      <Badge variant={STATE_VARIANT[p.review_state] ?? "outline"}>
                        {STATE_LABEL[p.review_state] ?? p.review_state}
                      </Badge>
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
                    <div className="text-xs text-muted-foreground">
                      Submitted {formatDate(p.created_at)}
                      {showReviewer && p.claimer_profile && (
                        <>
                          {" · Claimed by "}
                          <span className="font-medium">
                            {p.claimer_profile.full_name || p.claimer_profile.business_name}
                          </span>
                          {p.review_started_at && ` at ${formatDate(p.review_started_at)}`}
                        </>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}>
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
                  <Label htmlFor={`en-${m.method}`} className="text-xs">Enabled</Label>
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
                  <Input value={v.label ?? ""} onChange={(e) => patch(m.method, { label: e.target.value })} />
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

  useEffect(() => { load(); }, []);

  const toggle = async (key: string, enabled: boolean) => {
    const { error } = await supabase.from("feature_flags").update({ enabled }).eq("key", key);
    if (error) toast.error(error.message);
    else toast.success("Updated");
    await load();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <StripeGCashAdminPanel />
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-xs text-muted-foreground">
            Toggle payment rails. Disabled rails are hidden from checkout pickers globally.
          </p>
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-mono text-sm">{f.key}</div>
                {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
              </div>
              <Switch checked={!!f.enabled} onCheckedChange={(c) => toggle(f.key, c)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const REVIEW_STATES: (ReviewState | "all")[] = [
  "all",
  "awaiting_review",
  "in_review",
  "approved",
  "rejected",
  "not_applicable",
];

type MethodFilter = "all" | "gcash" | "gcash_stripe" | "gcash_manual";

const METHOD_FILTERS: { id: MethodFilter; label: string; methods: string[] | null }[] = [
  { id: "all", label: "All methods", methods: null },
  { id: "gcash", label: "All GCash", methods: ["stripe:gcash", "gcash_manual"] },
  { id: "gcash_stripe", label: "GCash (Stripe)", methods: ["stripe:gcash"] },
  { id: "gcash_manual", label: "GCash (Manual)", methods: ["gcash_manual"] },
];

function downloadCSV(filename: string, rows: any[]) {
  const cols = [
    "invoice_number",
    "created_at",
    "kind",
    "method",
    "amount_php",
    "status",
    "review_state",
    "buyer",
    "reference",
  ];
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows
    .map((r) =>
      [
        r.invoice_number ?? r.id,
        r.created_at,
        r.kind,
        r.method ?? "",
        r.amount_php,
        r.status,
        r.review_state,
        r.profile?.business_name || r.profile?.full_name || "",
        r.reference ?? "",
      ]
        .map(escape)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([cols.join(",") + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AllPaymentsTab() {
  const list = useServerFn(adminListPayments);
  const [rows, setRows] = useState<any[]>([]);
  const [state, setState] = useState<ReviewState | "all">("all");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await list({ data: { review_state: state, q: q || undefined, limit: 500 } }));
    } finally {
      setLoading(false);
    }
  }, [list, state, q]);

  useEffect(() => { load(); }, [load]);

  const allowedMethods = METHOD_FILTERS.find((f) => f.id === methodFilter)?.methods;
  const filteredRows = allowedMethods
    ? rows.filter((r) => allowedMethods.includes(r.method))
    : rows;

  const gcashTotal = filteredRows
    .filter((r) => r.status === "paid" && (r.method === "stripe:gcash" || r.method === "gcash_manual"))
    .reduce((sum, r) => sum + Number(r.amount_php || 0), 0);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {REVIEW_STATES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={state === s ? "default" : "outline"}
              onClick={() => setState(s)}
            >
              {s === "all" ? "All" : STATE_LABEL[s]}
            </Button>
          ))}
          <Input
            placeholder="Search invoice or reference…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="ml-auto max-w-xs"
          />
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Search"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
          {METHOD_FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={methodFilter === f.id ? "default" : "outline"}
              onClick={() => setMethodFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
          {methodFilter !== "all" && (
            <Badge variant="outline" className="ml-1">
              {filteredRows.length} match{filteredRows.length === 1 ? "" : "es"} · paid GCash {formatPHP(gcashTotal)}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() =>
              downloadCSV(
                `payments-${methodFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
                filteredRows,
              )
            }
            disabled={!filteredRows.length}
          >
            <Download className="mr-1 h-3 w-3" />
            Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Invoice</th>
                <th>Buyer</th>
                <th>Kind</th>
                <th>Method</th>
                <th className="text-right">Amount</th>
                <th>Review</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-t hover:bg-accent/30"
                  onClick={() => setSelected(r.id)}
                >
                  <td className="py-2 font-mono text-xs">
                    {r.invoice_number ?? r.id.slice(0, 8)}
                  </td>
                  <td className="text-xs">
                    {r.profile?.business_name || r.profile?.full_name || "—"}
                  </td>
                  <td>{r.kind}</td>
                  <td>
                    {r.method === "stripe:gcash" ? (
                      <Badge className="gap-1 bg-primary/15 text-primary border-primary/30">
                        <Smartphone className="h-3 w-3" /> GCash · Stripe
                      </Badge>
                    ) : r.method === "gcash_manual" ? (
                      <Badge className="gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400">
                        <Smartphone className="h-3 w-3" /> GCash · Manual
                      </Badge>
                    ) : (
                      r.method ?? "—"
                    )}
                  </td>
                  <td className="text-right">{formatPHP(Number(r.amount_php))}</td>
                  <td>
                    <Badge variant={STATE_VARIANT[r.review_state] ?? "outline"}>
                      {STATE_LABEL[r.review_state] ?? r.review_state}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={r.status === "paid" ? "default" : "outline"}>{r.status}</Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                </tr>
              ))}
              {!filteredRows.length && !loading && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                    No payments match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaymentReviewDrawer
          paymentId={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      </CardContent>
    </Card>
  );
}
