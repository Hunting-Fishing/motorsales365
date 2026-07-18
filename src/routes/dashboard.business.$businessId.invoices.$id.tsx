import { useMemo, useState } from "react";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2, Package, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  getBusinessInvoice,
  updateBusinessInvoice,
  addBusinessInvoiceItem,
  deleteBusinessInvoiceItem,
  listBusinessServicesForInvoice,
} from "@/lib/business-invoices.functions";
import { listBusinessInventory } from "@/lib/business-inventory.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/dashboard/business/$businessId/invoices/$id")({
  component: InvoiceDetail,
});

const STATUSES = ["draft", "sent", "paid", "void"] as const;

function InvoiceDetail() {
  const { businessId, id } = useParams({
    from: "/dashboard/business/$businessId/invoices/$id",
  });
  const { user } = useAuth();
  const qc = useQueryClient();
  const getFn = useServerFn(getBusinessInvoice);
  const updateFn = useServerFn(updateBusinessInvoice);
  const addItemFn = useServerFn(addBusinessInvoiceItem);
  const delItemFn = useServerFn(deleteBusinessInvoiceItem);
  const invListFn = useServerFn(listBusinessInventory);
  const svcListFn = useServerFn(listBusinessServicesForInvoice);

  const q = useQuery({
    queryKey: ["business-invoice", businessId, id],
    enabled: !!user?.id,
    queryFn: () => getFn({ data: { id, businessId } }),
  });

  const inventoryQ = useQuery({
    queryKey: ["business-inventory", businessId],
    enabled: !!user?.id,
    queryFn: () => invListFn({ data: { businessId } }),
  });

  const servicesQ = useQuery({
    queryKey: ["business-services-invoice", businessId],
    enabled: !!user?.id,
    queryFn: () => svcListFn({ data: { businessId } }),
  });

  const [tab, setTab] = useState<"item" | "service" | "custom">("item");
  const [line, setLine] = useState({
    inventory_item_id: "",
    service_id: "",
    description: "",
    quantity: "1",
    unit_price: "",
  });
  const [savingLine, setSavingLine] = useState(false);

  const inventory = inventoryQ.data ?? [];
  const services = servicesQ.data ?? [];
  const selectedInv = useMemo(
    () => inventory.find((i: any) => i.id === line.inventory_item_id),
    [inventory, line.inventory_item_id],
  );

  function onPickInventory(itemId: string) {
    const it = inventory.find((i: any) => i.id === itemId);
    setLine({
      inventory_item_id: itemId,
      service_id: "",
      description: it?.name ?? "",
      quantity: "1",
      unit_price: it?.price != null ? String(it.price) : "",
    });
  }

  function onPickService(svcId: string) {
    const s = services.find((x: any) => x.id === svcId);
    setLine({
      inventory_item_id: "",
      service_id: svcId,
      description: s?.title ?? "",
      quantity: "1",
      unit_price: s?.price_php != null ? String(s.price_php) : "",
    });
  }


  async function addLine() {
    setSavingLine(true);
    try {
      await addItemFn({
        data: {
          invoiceId: id,
          businessId,
          inventory_item_id: line.inventory_item_id || null,
          description: line.description,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price) || 0,
        },
      });
      setLine({ inventory_item_id: "", service_id: "", description: "", quantity: "1", unit_price: "" });
      qc.invalidateQueries({ queryKey: ["business-invoice", businessId, id] });
      qc.invalidateQueries({ queryKey: ["business-inventory", businessId] });
      toast.success("Line added");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add line");
    } finally {
      setSavingLine(false);
    }
  }

  async function removeLine(lineId: string) {
    if (!confirm("Remove this line? Any deducted stock will be returned.")) return;
    try {
      await delItemFn({ data: { id: lineId, businessId } });
      qc.invalidateQueries({ queryKey: ["business-invoice", businessId, id] });
      qc.invalidateQueries({ queryKey: ["business-inventory", businessId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove");
    }
  }

  async function changeStatus(status: string) {
    try {
      await updateFn({ data: { id, businessId, status: status as any } });
      qc.invalidateQueries({ queryKey: ["business-invoice", businessId, id] });
      qc.invalidateQueries({ queryKey: ["business-invoices", businessId] });
      toast.success(`Marked ${status}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  if (q.isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!q.data) {
    return <div className="p-4 text-sm text-destructive">Invoice not found</div>;
  }

  const { invoice, items } = q.data as any;

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/dashboard/business/$businessId/invoices"
          params={{ businessId }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> All invoices
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{invoice.invoice_number}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{invoice.currency}</Badge>
            <Select value={invoice.status} onValueChange={changeStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {invoice.customer_name || "No customer"} · issued{" "}
          {new Date(invoice.issue_date).toLocaleDateString()}
          {invoice.due_date &&
            ` · due ${new Date(invoice.due_date).toLocaleDateString()}`}
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <p className="font-medium flex items-center gap-2">
          <Package className="h-4 w-4" /> Add line item
        </p>
        <Tabs
          value={tab}
          onValueChange={(v) => {
            const next = v as "item" | "service" | "custom";
            setTab(next);
            setLine({ inventory_item_id: "", service_id: "", description: "", quantity: "1", unit_price: "" });
          }}
        >
          <TabsList>
            <TabsTrigger value="item">
              <Package className="h-3.5 w-3.5 mr-1" /> Inventory item
            </TabsTrigger>
            <TabsTrigger value="service">
              <Wrench className="h-3.5 w-3.5 mr-1" /> Service / job
            </TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="item" className="pt-3">
            <Label className="text-xs">Pick from inventory (auto-deducts stock)</Label>
            <Select
              value={line.inventory_item_id || ""}
              onValueChange={(v) => onPickInventory(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={inventory.length === 0 ? "No inventory yet — add items first" : "Choose an inventory item…"} />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((it: any) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.name} — {Number(it.qty_on_hand ?? 0)} {it.unit}
                    {it.price != null ? ` · ₱${Number(it.price).toLocaleString()}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedInv && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {Number(selectedInv.qty_on_hand ?? 0)} on hand · SKU {selectedInv.sku ?? "—"}
              </p>
            )}
          </TabsContent>

          <TabsContent value="service" className="pt-3">
            <Label className="text-xs">Pick a service / job from your catalog</Label>
            <Select value={line.service_id || ""} onValueChange={(v) => onPickService(v)}>
              <SelectTrigger>
                <SelectValue placeholder={services.length === 0 ? "No services yet — add them in your business profile" : "Choose a service…"} />
              </SelectTrigger>
              <SelectContent>
                {services.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                    {s.price_php != null ? ` · ₱${Number(s.price_php).toLocaleString()}` : ""}
                    {s.unit ? ` / ${s.unit}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          <TabsContent value="custom" className="pt-3">
            <p className="text-xs text-muted-foreground">
              Type a custom description and price below — no stock will be deducted.
            </p>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="md:col-span-4">
            <Label className="text-xs">Description</Label>
            <Input
              value={line.description}
              onChange={(e) => setLine({ ...line, description: e.target.value })}
              placeholder="Service or item description"
            />
          </div>
          <div>
            <Label className="text-xs">Qty</Label>
            <Input
              type="number"
              value={line.quantity}
              onChange={(e) => setLine({ ...line, quantity: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Unit price</Label>
            <Input
              type="number"
              value={line.unit_price}
              onChange={(e) => setLine({ ...line, unit_price: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Line total:{" "}
            <span className="font-medium text-foreground">
              {invoice.currency}{" "}
              {(Number(line.quantity || 0) * Number(line.unit_price || 0)).toLocaleString()}
            </span>
          </div>
          <Button
            onClick={addLine}
            disabled={savingLine || !line.description || !line.quantity}
          >
            <Plus className="h-4 w-4 mr-1" /> Add line
          </Button>
        </div>

      </Card>

      <Card className="divide-y">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No line items yet.
          </div>
        ) : (
          items.map((it: any) => (
            <div key={it.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{it.description}</div>
                <div className="text-xs text-muted-foreground">
                  {Number(it.quantity)} × {Number(it.unit_price).toLocaleString()}
                  {it.inventory_item_id && " · from inventory"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-semibold">
                  {invoice.currency} {Number(it.line_total).toLocaleString()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(it.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card className="p-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{Number(invoice.subtotal ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Tax ({Number(invoice.tax_rate ?? 0)}%)
          </span>
          <span>{Number(invoice.tax_amount ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-semibold text-base pt-2 border-t">
          <span>Total</span>
          <span>
            {invoice.currency} {Number(invoice.total ?? 0).toLocaleString()}
          </span>
        </div>
      </Card>

      {invoice.notes && (
        <Card className="p-4">
          <p className="text-xs uppercase text-muted-foreground mb-1">Notes</p>
          <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
        </Card>
      )}
    </div>
  );
}
