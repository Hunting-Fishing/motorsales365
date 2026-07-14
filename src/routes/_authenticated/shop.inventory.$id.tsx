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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/_authenticated/shop/inventory/$id")({
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
          <Link to="/shop/inventory">
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
              <div className="flex gap-2">
                {low ? (
                  <Badge variant="destructive">Low stock</Badge>
                ) : (
                  <Badge variant="outline">{data.status ?? "OK"}</Badge>
                )}
                {data.category ? <Badge variant="outline">{data.category}</Badge> : null}
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
