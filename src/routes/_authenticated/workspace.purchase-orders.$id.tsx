import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, PackageCheck, PackageSearch } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { smSupabase } from "@/lib/shop-manager/db";
import { toast } from "sonner";

type PO = {
  id: string;
  po_number: string | null;
  supplier_id: string | null;
  status: string | null;
  order_date: string | null;
  expected_delivery_date: string | null;
  total_amount: number | null;
  notes: string | null;
};

type POItem = {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  quantity: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  received_quantity: number | null;
};

async function fetchPO(id: string) {
  const { data, error } = await (smSupabase as any)
    .from("purchase_orders")
    .select("id,po_number,supplier_id,status,order_date,expected_delivery_date,total_amount,notes")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as PO | null;
}

async function fetchPOItems(poId: string) {
  const { data, error } = await (smSupabase as any)
    .from("purchase_order_items")
    .select("id,purchase_order_id,product_id,quantity,unit_cost,total_cost,received_quantity")
    .eq("purchase_order_id", poId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as POItem[];
}

export const Route = createFileRoute("/_authenticated/workspace/purchase-orders/$id")({
  head: () => ({
    meta: [
      { title: "PO Detail — Shop Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PODetail,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Purchase order</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">PO not found.</div>
    </SiteLayout>
  ),
});

function PODetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: po, isLoading } = useQuery({
    queryKey: ["shop-manager", "po", id],
    queryFn: () => fetchPO(id),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["shop-manager", "po", id, "items"],
    queryFn: () => fetchPOItems(id),
  });

  const receiveAll = useMutation({
    mutationFn: async () => {
      for (const it of items) {
        const remaining = (it.quantity ?? 0) - (it.received_quantity ?? 0);
        if (remaining > 0) {
          const { error } = await (smSupabase as any)
            .from("purchase_order_items")
            .update({ received_quantity: it.quantity ?? 0 })
            .eq("id", it.id);
          if (error) throw error;
        }
      }
      const { error } = await (smSupabase as any)
        .from("purchase_orders")
        .update({ status: "received" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PO fully received");
      qc.invalidateQueries({ queryKey: ["shop-manager", "po", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to receive"),
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </SiteLayout>
    );
  }
  if (!po) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">PO not found.</div>
      </SiteLayout>
    );
  }

  const totalOrdered = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const totalReceived = items.reduce((s, i) => s + (i.received_quantity ?? 0), 0);
  const fullyReceived = totalOrdered > 0 && totalReceived >= totalOrdered;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PackageSearch className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">PO {po.po_number ?? po.id.slice(0, 8)}</h1>
              <p className="text-muted-foreground">
                Ordered {po.order_date ? new Date(po.order_date).toLocaleDateString() : "—"}
                {po.expected_delivery_date
                  ? ` · expected ${new Date(po.expected_delivery_date).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={fullyReceived ? "default" : "outline"}>{po.status ?? "draft"}</Badge>
            {!fullyReceived && items.length > 0 && (
              <Button onClick={() => receiveAll.mutate()} disabled={receiveAll.isPending}>
                <PackageCheck className="mr-2 h-4 w-4" /> Receive all
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total ordered</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalOrdered}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total received</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalReceived}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total ₱</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {typeof po.total_amount === "number" ? po.total_amount.toLocaleString() : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="py-8 px-4 text-sm text-muted-foreground">No line items.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Unit ₱</TableHead>
                    <TableHead className="text-right">Total ₱</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <POItemRow key={it.id} item={it} poId={id} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button asChild variant="ghost">
            <Link to="/shop/purchase-orders">← Back to POs</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}

function POItemRow({ item, poId }: { item: POItem; poId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const remaining = (item.quantity ?? 0) - (item.received_quantity ?? 0);
  const [qty, setQty] = useState<number>(remaining > 0 ? remaining : 0);

  const receive = useMutation({
    mutationFn: async () => {
      const newReceived = (item.received_quantity ?? 0) + qty;
      const { error } = await (smSupabase as any)
        .from("purchase_order_items")
        .update({ received_quantity: newReceived })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Receipt recorded");
      qc.invalidateQueries({ queryKey: ["shop-manager", "po", poId, "items"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to record"),
  });

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{item.product_id ?? "—"}</TableCell>
      <TableCell className="text-right">{item.quantity ?? 0}</TableCell>
      <TableCell className="text-right">
        <span className={remaining > 0 ? "text-amber-600 font-semibold" : ""}>
          {item.received_quantity ?? 0}
        </span>
      </TableCell>
      <TableCell className="text-right">
        {typeof item.unit_cost === "number" ? item.unit_cost.toLocaleString() : "—"}
      </TableCell>
      <TableCell className="text-right">
        {typeof item.total_cost === "number" ? item.total_cost.toLocaleString() : "—"}
      </TableCell>
      <TableCell className="text-right">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={remaining <= 0}>
              Receive
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Receive stock</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Remaining to receive: <strong>{remaining}</strong>
              </p>
              <div>
                <label className="text-sm">Quantity received</label>
                <Input
                  type="number"
                  min={1}
                  max={remaining}
                  value={qty}
                  onChange={(e) => setQty(Math.max(0, parseInt(e.target.value || "0", 10)))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={() => receive.mutate()}
                disabled={receive.isPending || qty <= 0 || qty > remaining}
              >
                {receive.isPending ? "Saving…" : "Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
