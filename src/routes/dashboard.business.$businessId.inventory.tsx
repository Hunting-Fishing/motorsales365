import { useEffect, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Package, Trash2, Pencil, Minus, Plus as PlusIcon, AlertTriangle, Radio } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  listBusinessInventory,
  upsertBusinessInventoryItem,
  adjustBusinessInventory,
  deleteBusinessInventoryItem,
} from "@/lib/business-inventory.functions";
import {
  listShopInquiries,
  updateNetworkInquiryStatus,
  reserveNetworkInquiry,
  releaseNetworkInquiry,
  NETWORK_INQUIRY_STATUSES,
  type NetworkInquiryStatus,
} from "@/lib/network-stock.functions";
import { NetworkExposureCard } from "@/components/parts/network-exposure-card";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { InventoryItemFormDialog } from "@/components/business/inventory-item-form";

export const Route = createFileRoute("/dashboard/business/$businessId/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId/inventory" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const loadFn = useServerFn(listBusinessInventory);
  const upsertFn = useServerFn(upsertBusinessInventoryItem);
  const adjustFn = useServerFn(adjustBusinessInventory);
  const delFn = useServerFn(deleteBusinessInventoryItem);
  const inquiriesFn = useServerFn(listShopInquiries);

  const q = useQuery({
    queryKey: ["business-inventory", businessId],
    enabled: !!user?.id,
    queryFn: () => loadFn({ data: { businessId } }),
  });

  const businessMeta = useQuery({
    queryKey: ["business-kind", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("type_slug")
        .eq("id", businessId)
        .maybeSingle();
      if (error) throw error;
      return (data?.type_slug as string | null) ?? null;
    },
  });


  const inquiries = useQuery({
    queryKey: ["business-network-inquiries", businessId],
    enabled: !!user?.id,
    queryFn: () => inquiriesFn({ data: { businessId } }),
  });

  // Realtime: reflect stock changes from other staff/devices instantly.
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`inv-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "business_inventory_items",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["business-inventory", businessId] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "network_part_inquiries",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["business-network-inquiries", businessId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, qc]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setOpen(true);
  }


  async function adjust(itemId: string, delta: number) {
    try {
      await adjustFn({
        data: { itemId, businessId, delta, reason: delta > 0 ? "Restock" : "Used" },
      });
      qc.invalidateQueries({ queryKey: ["business-inventory", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await delFn({ data: { id, businessId } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["business-inventory", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  }

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" /> Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Track straps, dollies, fuel, spare parts, and any other consumables.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Add item
        </Button>
      </div>

      <NetworkExposureCard businessId={businessId} />


      {inquiries.data && inquiries.data.length > 0 && (
        <Card className="divide-y">
          <div className="p-4">
            <p className="font-medium">Network part requests</p>
            <p className="text-sm text-muted-foreground">
              Track requests through Pending → Accepted / Rejected → Fulfilled.
            </p>
          </div>
          {inquiries.data.slice(0, 20).map((r: any) => (
            <InquiryRow key={r.id} row={r} businessId={businessId} />
          ))}
        </Card>
      )}


      <Card className="divide-y">
        {q.isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!q.isLoading && rows.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No inventory yet. Add items you want to track so you never run out.
          </div>
        )}
        {rows.map((it: any) => {
          const low =
            it.reorder_at != null && Number(it.qty_on_hand) <= Number(it.reorder_at);
          return (
            <div key={it.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {it.name}
                  {low && (
                    <Badge variant="destructive" className="text-[10px]">
                      <AlertTriangle className="h-3 w-3 mr-1" /> low
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {it.sku && <span>SKU {it.sku} · </span>}
                  {it.category && <span>{it.category} · </span>}
                  {it.location && <span>@ {it.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjust(it.id, -1)}
                    aria-label="Decrease"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <div className="w-14 text-center font-semibold">
                    {Number(it.qty_on_hand)}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => adjust(it.id, 1)}
                    aria-label="Increase"
                  >
                    <PlusIcon className="h-3 w-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground ml-1">{it.unit}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(it)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(it.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      <InventoryItemFormDialog
        open={open}
        onOpenChange={setOpen}
        businessId={businessId}
        businessKind={businessMeta.data ?? null}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["business-inventory", businessId] })}
      />
    </div>
  );
}

const STATUS_VARIANT: Record<NetworkInquiryStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  accepted: "secondary",
  rejected: "destructive",
  fulfilled: "outline",
  closed: "outline",
};

function InquiryRow({ row, businessId }: { row: any; businessId: string }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateNetworkInquiryStatus);
  const reserveFn = useServerFn(reserveNetworkInquiry);
  const releaseFn = useServerFn(releaseNetworkInquiry);
  const [note, setNote] = useState(row.response_note ?? "");
  const [busy, setBusy] = useState<NetworkInquiryStatus | "reserve" | "release" | null>(null);
  const [fulfillFor, setFulfillFor] = useState<NetworkInquiryStatus | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserve, setReserve] = useState({
    quantity: String(row.reserved_quantity ?? row.quantity ?? 1),
    hours: "24",
  });
  const [fulfill, setFulfill] = useState({
    price: row.fulfilled_price != null ? String(row.fulfilled_price) : "",
    quantity:
      row.fulfilled_quantity != null
        ? String(row.fulfilled_quantity)
        : String(row.quantity ?? 1),
    eta: row.fulfilled_eta
      ? new Date(row.fulfilled_eta).toISOString().slice(0, 16)
      : "",
    message: row.fulfilled_message ?? "",
  });

  async function setStatus(
    status: NetworkInquiryStatus,
    extras?: Parameters<typeof updateFn>[0]["data"],
  ) {
    setBusy(status);
    try {
      await updateFn({
        data: {
          id: row.id,
          businessId,
          status,
          note: note.trim() || null,
          ...extras,
        } as any,
      });
      toast.success(`Marked ${status}`);
      qc.invalidateQueries({ queryKey: ["business-network-inquiries", businessId] });
      setFulfillFor(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    } finally {
      setBusy(null);
    }
  }

  function handleClick(s: NetworkInquiryStatus) {
    if (s === "fulfilled" || s === "closed") {
      setFulfillFor(s);
      return;
    }
    if (s === "accepted" && row.item_id) {
      setReserveOpen(true);
      return;
    }
    setStatus(s);
  }

  async function submitReserve() {
    const qty = Number(reserve.quantity);
    const hours = Number(reserve.hours);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity to hold");
      return;
    }
    if (!Number.isInteger(hours) || hours <= 0 || hours > 168) {
      toast.error("Hold window must be 1–168 hours");
      return;
    }
    setBusy("reserve");
    try {
      await reserveFn({
        data: {
          inquiryId: row.id,
          businessId,
          quantity: qty,
          hours,
          note: note.trim() || null,
        },
      });
      toast.success(`Reserved ${qty} for ${hours}h`);
      setReserveOpen(false);
      qc.invalidateQueries({ queryKey: ["business-network-inquiries", businessId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to reserve");
    } finally {
      setBusy(null);
    }
  }

  async function releaseHold() {
    setBusy("release");
    try {
      await releaseFn({ data: { inquiryId: row.id, businessId } });
      toast.success("Reservation released");
      qc.invalidateQueries({ queryKey: ["business-network-inquiries", businessId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to release");
    } finally {
      setBusy(null);
    }
  }


  async function submitFulfill() {
    if (!fulfillFor) return;
    const priceNum = fulfill.price.trim() === "" ? null : Number(fulfill.price);
    const qtyNum = fulfill.quantity.trim() === "" ? null : Number(fulfill.quantity);
    if (priceNum != null && (Number.isNaN(priceNum) || priceNum < 0)) {
      toast.error("Enter a valid price");
      return;
    }
    if (qtyNum != null && (Number.isNaN(qtyNum) || qtyNum <= 0)) {
      toast.error("Enter a valid quantity");
      return;
    }
    await setStatus(fulfillFor, {
      id: row.id,
      businessId,
      status: fulfillFor,
      note: note.trim() || null,
      fulfilled_price: priceNum,
      fulfilled_quantity: qtyNum,
      fulfilled_eta: fulfill.eta ? new Date(fulfill.eta).toISOString() : null,
      fulfilled_message: fulfill.message.trim() || null,
    });
  }

  const status = (row.status ?? "pending") as NetworkInquiryStatus;
  return (
    <div className="p-4 space-y-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">
            {row.part_name}
            {row.sku ? <span className="text-muted-foreground"> · {row.sku}</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.contact_name} · {row.contact_email}
            {row.contact_phone ? ` · ${row.contact_phone}` : ""} · qty {Number(row.quantity)}
          </p>
          {row.message ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{row.message}</p>
          ) : null}
        </div>
        <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="capitalize">
          {status}
        </Badge>
      </div>

      {(row.fulfilled_price != null ||
        row.fulfilled_quantity != null ||
        row.fulfilled_eta ||
        row.fulfilled_message) && (
        <div className="rounded-md border bg-muted/40 p-2 text-xs">
          <p className="font-medium">Fulfillment update</p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
            {row.fulfilled_price != null && (
              <span>Price ₱{Number(row.fulfilled_price).toLocaleString()}</span>
            )}
            {row.fulfilled_quantity != null && (
              <span>Qty {Number(row.fulfilled_quantity)}</span>
            )}
            {row.fulfilled_eta && (
              <span>ETA {new Date(row.fulfilled_eta).toLocaleString()}</span>
            )}
          </div>
          {row.fulfilled_message && (
            <p className="mt-1 text-muted-foreground">{row.fulfilled_message}</p>
          )}
        </div>
      )}

      {row.reserved_quantity && row.reserved_until && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
          <p className="font-medium text-amber-700 dark:text-amber-400">
            Holding {Number(row.reserved_quantity)} unit(s)
            {new Date(row.reserved_until) > new Date()
              ? ` · expires ${new Date(row.reserved_until).toLocaleString()}`
              : " · hold expired"}
          </p>
          <button
            onClick={releaseHold}
            disabled={busy !== null}
            className="mt-1 text-xs underline text-amber-700 dark:text-amber-400 disabled:opacity-50"
          >
            {busy === "release" ? "Releasing…" : "Release hold"}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Short note to the customer (reason, callback time…)"
          className="h-8 text-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {NETWORK_INQUIRY_STATUSES.filter((s) => s !== status).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={
                s === "rejected"
                  ? "destructive"
                  : s === "accepted"
                    ? "default"
                    : "outline"
              }
              disabled={busy !== null}
              onClick={() => handleClick(s)}
              className="capitalize"
            >
              {busy === s ? "…" : s}
            </Button>
          ))}
        </div>
      </div>
      {row.responded_at && (
        <p className="text-[11px] text-muted-foreground">
          Last updated {new Date(row.responded_at).toLocaleString()}
        </p>
      )}

      <Dialog open={!!fulfillFor} onOpenChange={(o) => !o && setFulfillFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Mark as {fulfillFor === "closed" ? "Closed" : "Fulfilled"}
            </DialogTitle>
            <DialogDescription>
              Attach the final price, quantity, ETA, and a message. The customer sees
              this on their request status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Final price (₱)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={fulfill.price}
                onChange={(e) => setFulfill({ ...fulfill, price: e.target.value })}
                placeholder="e.g. 1250"
              />
            </div>
            <div>
              <Label>Quantity ready</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={fulfill.quantity}
                onChange={(e) => setFulfill({ ...fulfill, quantity: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>ETA / pickup time</Label>
              <Input
                type="datetime-local"
                value={fulfill.eta}
                onChange={(e) => setFulfill({ ...fulfill, eta: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Message to customer</Label>
              <Textarea
                rows={3}
                value={fulfill.message}
                onChange={(e) => setFulfill({ ...fulfill, message: e.target.value })}
                placeholder={
                  fulfillFor === "closed"
                    ? "e.g. Customer did not confirm; closing request."
                    : "e.g. Ready for pickup at counter 2 tomorrow after 10am."
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFulfillFor(null)}>
              Cancel
            </Button>
            <Button onClick={submitFulfill} disabled={busy !== null}>
              {busy ? "Saving…" : `Mark ${fulfillFor}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Accept & hold stock</DialogTitle>
            <DialogDescription>
              Reserve stock for this customer so it can't be sold to anyone else while you
              coordinate pickup. The hold auto-expires when the window ends.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity to hold</Label>
              <Input
                type="number"
                min={1}
                step="1"
                value={reserve.quantity}
                onChange={(e) => setReserve({ ...reserve, quantity: e.target.value })}
              />
            </div>
            <div>
              <Label>Hold for (hours)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                step="1"
                value={reserve.hours}
                onChange={(e) => setReserve({ ...reserve, hours: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Common windows: 4h, 24h, 48h. Max 168h (7 days).
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReserveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReserve} disabled={busy !== null}>
              {busy === "reserve" ? "Reserving…" : "Accept & hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
