import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Package, Trash2, Pencil, Minus, Plus as PlusIcon, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  listBusinessInventory,
  upsertBusinessInventoryItem,
  adjustBusinessInventory,
  deleteBusinessInventoryItem,
} from "@/lib/business-inventory.functions";
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

  const q = useQuery({
    queryKey: ["business-inventory", businessId],
    enabled: !!user?.id,
    queryFn: () => loadFn({ data: { businessId } }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    name: "",
    sku: "",
    category: "",
    unit: "pc",
    qty_on_hand: 0,
    reorder_at: "",
    cost: "",
    location: "",
  });
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setForm({
      name: "",
      sku: "",
      category: "",
      unit: "pc",
      qty_on_hand: 0,
      reorder_at: "",
      cost: "",
      location: "",
    });
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
      location: row.location ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsertFn({
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
          location: form.location || null,
        },
      });
      toast.success("Saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["business-inventory", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
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
