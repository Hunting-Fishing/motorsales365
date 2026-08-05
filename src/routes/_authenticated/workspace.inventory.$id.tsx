import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Boxes, Loader2, Plus, Minus, Pencil } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { smSupabase } from "@/lib/shop-manager/db";

type InventoryItem = {
  id: string;
  name: string | null;
  sku: string | null;
  part_number: string | null;
  barcode: string | null;
  category: string | null;
  subcategory: string | null;
  supplier: string | null;
  manufacturer: string | null;
  quantity: number | null;
  quantity_in_stock: number | null;
  reorder_point: number | null;
  on_hold: number | null;
  on_order: number | null;
  unit_price: number | null;
  cost_per_unit: number | null;
  sell_price_per_unit: number | null;
  margin_markup: number | null;
  location: string | null;
  status: string | null;
  description: string | null;
  vehicle_compatibility: string | null;
  warranty_period: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type InventoryTxn = {
  id: string;
  transaction_type: string | null;
  quantity: number | null;
  transaction_date: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
};

async function fetchItem(id: string): Promise<InventoryItem | null> {
  const { data, error } = await (smSupabase as any)
    .from("inventory_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as InventoryItem) ?? null;
}

async function fetchTxns(id: string): Promise<InventoryTxn[]> {
  const { data, error } = await (smSupabase as any)
    .from("inventory_transactions")
    .select("id,transaction_type,quantity,transaction_date,reference_type,reference_id,notes")
    .eq("inventory_item_id", id)
    .order("transaction_date", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as InventoryTxn[];
}

export const Route = createFileRoute("/_authenticated/workspace/inventory/$id")({
  head: () => ({
    meta: [
      { title: "Inventory item — Shop Manager" },
      { name: "description", content: "Part details, stock levels, and transaction history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryItemPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Inventory item</h1>
          <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
          <Button
            className="mt-4"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Retry
          </Button>
        </div>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Item not found.</div>
    </SiteLayout>
  ),
});

function InventoryItemPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["shop-manager", "inventory", "detail", id],
    queryFn: () => fetchItem(id),
  });
  const { data: txns = [] } = useQuery({
    queryKey: ["shop-manager", "inventory", "txns", id],
    queryFn: () => fetchTxns(id),
  });

  const qty = data?.quantity ?? data?.quantity_in_stock ?? 0;
  const rp = data?.reorder_point ?? 0;
  const low = qty <= rp;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/workspace/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to inventory
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? (
          <Card>
            <CardHeader><CardTitle>Item not found</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This item may have been deleted or your shop no longer has access.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Boxes className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">{data.name ?? "Item"}</h1>
                  <p className="text-muted-foreground font-mono text-sm">
                    {data.sku ?? data.part_number ?? data.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {low ? (
                  <Badge variant="destructive">Low stock</Badge>
                ) : (
                  <Badge variant="outline">{data.status ?? "OK"}</Badge>
                )}
                {data.category ? <Badge variant="outline">{data.category}</Badge> : null}
                <AdjustStockDialog itemId={id} currentQty={qty} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Stock</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Field label="On hand" value={String(qty)} />
                  <Field label="Reorder point" value={String(rp)} />
                  <Field label="On hold" value={data.on_hold != null ? String(data.on_hold) : null} />
                  <Field label="On order" value={data.on_order != null ? String(data.on_order) : null} />
                  <Field label="Location" value={data.location} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Field label="Unit price" value={data.unit_price != null ? `₱${Number(data.unit_price).toLocaleString()}` : null} />
                  <Field label="Cost / unit" value={data.cost_per_unit != null ? `₱${Number(data.cost_per_unit).toLocaleString()}` : null} />
                  <Field label="Sell / unit" value={data.sell_price_per_unit != null ? `₱${Number(data.sell_price_per_unit).toLocaleString()}` : null} />
                  <Field label="Margin / markup" value={data.margin_markup != null ? `${data.margin_markup}%` : null} />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                  <Field label="Part number" value={data.part_number} />
                  <Field label="Barcode" value={data.barcode} />
                  <Field label="Supplier" value={data.supplier} />
                  <Field label="Manufacturer" value={data.manufacturer} />
                  <Field label="Subcategory" value={data.subcategory} />
                  <Field label="Warranty" value={data.warranty_period} />
                  <Field label="Vehicle compatibility" value={data.vehicle_compatibility} />
                  <Field label="Description" value={data.description} />
                  <Field label="Notes" value={data.notes} />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Recent transactions ({txns.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {txns.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">
                      No transactions recorded.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {txns.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              {t.transaction_date ? new Date(t.transaction_date).toLocaleString() : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{t.transaction_type ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{t.quantity ?? 0}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {t.reference_type ? `${t.reference_type}: ${(t.reference_id ?? "").slice(0, 8)}` : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{t.notes ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">
        {value && value.length > 0 ? value : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function AdjustStockDialog({
  itemId,
  currentQty,
}: {
  itemId: string;
  currentQty: number;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in" | "out" | "set">("in");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");

  const preview =
    mode === "set"
      ? Number(qty) || 0
      : mode === "in"
        ? currentQty + (Number(qty) || 0)
        : currentQty - (Number(qty) || 0);

  const adjust = useMutation({
    mutationFn: async () => {
      const q = Number(qty);
      if (!q || q <= 0) throw new Error("Enter a positive quantity");
      const newQty =
        mode === "set" ? q : mode === "in" ? currentQty + q : currentQty - q;
      if (newQty < 0) throw new Error("Resulting quantity cannot be negative");

      const delta = newQty - currentQty;
      const txnType =
        mode === "set" ? "adjustment" : mode === "in" ? "stock_in" : "stock_out";

      const { error: txErr } = await (smSupabase as any)
        .from("inventory_transactions")
        .insert({
          inventory_item_id: itemId,
          transaction_type: txnType,
          quantity: delta,
          transaction_date: new Date().toISOString(),
          reference_type: "manual_adjustment",
          notes: notes.trim() || null,
        });
      if (txErr) throw txErr;

      const { error: upErr } = await (smSupabase as any)
        .from("inventory_items")
        .update({ quantity: newQty, quantity_in_stock: newQty })
        .eq("id", itemId);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      toast.success("Stock updated");
      qc.invalidateQueries({ queryKey: ["shop-manager", "inventory"] });
      setOpen(false);
      setQty("");
      setNotes("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to adjust"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="mr-1 h-4 w-4" /> Adjust stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={mode === "in" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("in")}
            >
              <Plus className="mr-1 h-4 w-4" /> Stock in
            </Button>
            <Button
              type="button"
              variant={mode === "out" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("out")}
            >
              <Minus className="mr-1 h-4 w-4" /> Stock out
            </Button>
            <Button
              type="button"
              variant={mode === "set" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("set")}
            >
              Set exact
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Current</Label>
              <Input value={currentQty} readOnly />
            </div>
            <div>
              <Label>
                {mode === "set" ? "New quantity *" : "Quantity *"}
              </Label>
              <Input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            After: <span className="font-semibold">{preview}</span>
          </div>
          <div>
            <Label>Reason / notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Received PO, cycle count, damage, etc."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!qty || adjust.isPending} onClick={() => adjust.mutate()}>
            {adjust.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
