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
  getBusinessNetworkExposure,
  setBusinessNetworkExposure,
  listShopInquiries,
} from "@/lib/network-stock.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const exposureLoadFn = useServerFn(getBusinessNetworkExposure);
  const exposureSetFn = useServerFn(setBusinessNetworkExposure);
  const inquiriesFn = useServerFn(listShopInquiries);

  const q = useQuery({
    queryKey: ["business-inventory", businessId],
    enabled: !!user?.id,
    queryFn: () => loadFn({ data: { businessId } }),
  });

  const exposure = useQuery({
    queryKey: ["business-exposure", businessId],
    enabled: !!user?.id,
    queryFn: () => exposureLoadFn({ data: { businessId } }),
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
  const emptyForm = {
    name: "",
    sku: "",
    category: "",
    unit: "pc",
    qty_on_hand: 0,
    reorder_at: "",
    cost: "",
    price: "",
    location: "",
    network_visible: true,
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setForm({
      name: row.name,
      sku: row.sku ?? "",
      category: row.category ?? "",
      unit: row.unit ?? "pc",
      qty_on_hand: row.qty_on_hand ?? 0,
      reorder_at: row.reorder_at ?? "",
      cost: row.cost ?? "",
      price: row.price ?? "",
      location: row.location ?? "",
      network_visible: row.network_visible ?? true,
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res: any = await upsertFn({
        data: {
          id: editing?.id,
          businessId,
          name: form.name,
          sku: form.sku || null,
          category: form.category || null,
          unit: form.unit,
          qty_on_hand: Number(form.qty_on_hand) || 0,
          reorder_at: form.reorder_at === "" ? null : Number(form.reorder_at),
          cost: form.cost === "" ? null : Number(form.cost),
          price: form.price === "" ? null : Number(form.price),
          location: form.location || null,
          network_visible: !!form.network_visible,
        },
      });
      const { handlePlanLimitResult } = await import("@/lib/plan-limit-toast");
      if (handlePlanLimitResult(res, { businessId })) return;
      toast.success("Saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["business-inventory", businessId] });

    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleExposure(next: boolean) {
    try {
      await exposureSetFn({ data: { businessId, expose: next } });
      qc.invalidateQueries({ queryKey: ["business-exposure", businessId] });
      toast.success(next ? "Shop is now sharing stock with the network" : "Network sharing turned off");
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
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

      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" /> Share stock with the 365 network
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              When on, customers browsing <span className="font-mono">/parts/network</span> can
              see your live in-stock items, quantities, and price — and send you a request in
              one click. Cost, location, and internal notes are never exposed.
            </p>
          </div>
          <Switch
            checked={!!exposure.data?.expose}
            onCheckedChange={toggleExposure}
            aria-label="Toggle network stock sharing"
          />
        </div>
      </Card>

      {inquiries.data && inquiries.data.length > 0 && (
        <Card className="divide-y">
          <div className="p-4">
            <p className="font-medium">Recent network requests</p>
            <p className="text-sm text-muted-foreground">
              Customers who requested a part from your stock feed.
            </p>
          </div>
          {inquiries.data.slice(0, 10).map((r: any) => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {r.part_name}
                  {r.sku ? <span className="text-muted-foreground"> · {r.sku}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.contact_name} · {r.contact_email}
                  {r.contact_phone ? ` · ${r.contact_phone}` : ""} · qty {Number(r.quantity)}
                </p>
                {r.message ? (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.message}</p>
                ) : null}
              </div>
              <Badge variant={r.status === "new" ? "default" : "outline"}>{r.status}</Badge>
            </div>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit item" : "Add inventory item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tow strap 3m"
              />
            </div>
            <div>
              <Label>SKU</Label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="strap / dolly / fuel"
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="pc / L / kg"
              />
            </div>
            <div>
              <Label>On hand</Label>
              <Input
                type="number"
                value={form.qty_on_hand}
                onChange={(e) => setForm({ ...form, qty_on_hand: e.target.value })}
              />
            </div>
            <div>
              <Label>Reorder at</Label>
              <Input
                type="number"
                value={form.reorder_at}
                onChange={(e) => setForm({ ...form, reorder_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Cost (₱)</Label>
              <Input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Bay 2 shelf B"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.name || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
