import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Truck, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  listBusinessAssets,
  upsertBusinessAsset,
  deleteBusinessAsset,
} from "@/lib/business-assets.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KINDS = [
  { value: "tow_truck", label: "Tow truck" },
  { value: "flatbed", label: "Flatbed" },
  { value: "wrecker", label: "Wrecker" },
  { value: "service_van", label: "Service van" },
  { value: "trailer", label: "Trailer" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "out_of_service", label: "Out of service" },
  { value: "retired", label: "Retired" },
];

export const Route = createFileRoute("/dashboard/business/$businessId/fleet")({
  component: FleetPage,
});

function FleetPage() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId/fleet" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const loadFn = useServerFn(listBusinessAssets);
  const upsertFn = useServerFn(upsertBusinessAsset);
  const delFn = useServerFn(deleteBusinessAsset);

  const q = useQuery({
    queryKey: ["business-assets", businessId],
    enabled: !!user?.id,
    queryFn: () => loadFn({ data: { businessId } }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    kind: "tow_truck",
    name: "",
    plate: "",
    vin: "",
    capacity_kg: "",
    status: "active",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing(null);
    setForm({
      kind: "tow_truck",
      name: "",
      plate: "",
      vin: "",
      capacity_kg: "",
      status: "active",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setForm({
      kind: row.kind,
      name: row.name,
      plate: row.plate ?? "",
      vin: row.vin ?? "",
      capacity_kg: row.capacity_kg ?? "",
      status: row.status,
      notes: row.notes ?? "",
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
          kind: form.kind,
          name: form.name,
          plate: form.plate || null,
          vin: form.vin || null,
          capacity_kg: form.capacity_kg ? Number(form.capacity_kg) : null,
          status: form.status,
          notes: form.notes || null,
        },
      });
      toast.success(editing ? "Asset updated" : "Asset added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["business-assets", businessId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset?")) return;
    try {
      await delFn({ data: { id, businessId } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["business-assets", businessId] });
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
            <Truck className="h-5 w-5" /> Fleet & assets
          </h1>
          <p className="text-sm text-muted-foreground">
            Tow trucks, flatbeds, wreckers, service vans and other equipment.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Add asset
        </Button>
      </div>

      <Card className="divide-y">
        {q.isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!q.isLoading && rows.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No assets yet. Add your first truck to start assigning jobs.
          </div>
        )}
        {rows.map((a: any) => (
          <div key={a.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium">{a.name}</div>
              <div className="text-xs text-muted-foreground">
                <Badge variant="secondary">{a.kind}</Badge>{" "}
                {a.plate && <span>Plate: {a.plate} · </span>}
                {a.capacity_kg && <span>Capacity: {a.capacity_kg} kg · </span>}
                <Badge variant={a.status === "active" ? "default" : "outline"}>
                  {a.status}
                </Badge>
              </div>
              {a.notes && (
                <div className="text-xs text-muted-foreground mt-1 truncate">{a.notes}</div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit asset" : "Add asset"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Truck 01"
              />
            </div>
            <div>
              <Label>Kind</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plate</Label>
              <Input
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
              />
            </div>
            <div>
              <Label>Capacity (kg)</Label>
              <Input
                type="number"
                value={form.capacity_kg}
                onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>VIN</Label>
              <Input
                value={form.vin}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
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
