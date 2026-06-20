import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Settings2, Pencil, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { listAdSlots, updateAdSlot, reorderAdSlots } from "@/lib/advertise-slots.functions";

export const Route = createFileRoute("/admin/advertisements/slots")({
  component: AdminAdSlotsPage,
  head: () => ({
    meta: [{ title: "Ad slots — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

type Slot = any;

function AdminAdSlotsPage() {
  const { isAdmin, canManageAds } = useAuth();
  const hasAccess = isAdmin || canManageAds;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await listAdSlots();
      setSlots(res.slots);
      setAssignments(res.assignments);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) load();
  }, [hasAccess]);

  const grouped = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      if (!m.has(s.placement)) m.set(s.placement, []);
      m.get(s.placement)!.push(s);
    }
    return Array.from(m.entries());
  }, [slots]);

  const thumbnailFor = (slotId: string) => {
    const a = assignments.find((x) => x.slot_id === slotId && x.active);
    return a?.creative ?? null;
  };

  if (!hasAccess) {
    return <div className="p-6 text-sm text-muted-foreground">Ads manager role required.</div>;
  }

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateAdSlot({
        data: {
          id: editing.id,
          label: editing.label,
          description: editing.description ?? null,
          min_width: Number(editing.min_width),
          min_height: Number(editing.min_height),
          aspect_ratio: editing.aspect_ratio ?? null,
          max_bytes: Number(editing.max_bytes),
          allowed_mime: Array.isArray(editing.allowed_mime)
            ? editing.allowed_mime
            : String(editing.allowed_mime).split(",").map((s) => s.trim()).filter(Boolean),
          active: !!editing.active,
        },
      });
      toast.success("Slot updated");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (placement: string, ids: string[]) => {
    // optimistic
    setSlots((prev) => {
      const others = prev.filter((s) => s.placement !== placement);
      const inP = ids.map((id, idx) => ({ ...prev.find((s) => s.id === id)!, position: idx }));
      return [...others, ...inP].sort(
        (a, b) => a.placement.localeCompare(b.placement) || a.position - b.position,
      );
    });
    try {
      await reorderAdSlots({ data: { placement, orderedIds: ids } });
    } catch (e: any) {
      toast.error(e.message ?? "Reorder failed");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings2 className="h-5 w-5" /> Ad Slots
        </h2>
        <p className="text-sm text-muted-foreground">
          Define positions, image specs, and ordering for every ad surface across the site. Drag handles to reorder within a placement.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([placement, items]) => (
            <PlacementGroup
              key={placement}
              placement={placement}
              items={items}
              thumbnailFor={thumbnailFor}
              onEdit={setEditing}
              onReorder={(ids) => handleReorder(placement, ids)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit slot — {editing?.slot_key}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label>Label</Label>
                <Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Min width</Label>
                  <Input
                    type="number"
                    value={editing.min_width}
                    onChange={(e) => setEditing({ ...editing, min_width: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Min height</Label>
                  <Input
                    type="number"
                    value={editing.min_height}
                    onChange={(e) => setEditing({ ...editing, min_height: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Aspect</Label>
                  <Input
                    value={editing.aspect_ratio ?? ""}
                    placeholder="16:9"
                    onChange={(e) => setEditing({ ...editing, aspect_ratio: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Max bytes</Label>
                  <Input
                    type="number"
                    value={editing.max_bytes}
                    onChange={(e) => setEditing({ ...editing, max_bytes: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {(Number(editing.max_bytes) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div>
                  <Label>Allowed MIME (comma)</Label>
                  <Input
                    value={Array.isArray(editing.allowed_mime) ? editing.allowed_mime.join(",") : editing.allowed_mime}
                    onChange={(e) => setEditing({ ...editing, allowed_mime: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                <span className="text-sm">Active</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlacementGroup({
  placement,
  items,
  thumbnailFor,
  onEdit,
  onReorder,
}: {
  placement: string;
  items: Slot[];
  thumbnailFor: (id: string) => any;
  onEdit: (s: Slot) => void;
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const ids = items.map((s) => s.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(ids, oldIdx, newIdx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{placement}</h3>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {items.map((s) => (
              <SortableSlotRow key={s.id} slot={s} thumbnail={thumbnailFor(s.id)} onEdit={() => onEdit(s)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableSlotRow({
  slot,
  thumbnail,
  onEdit,
}: {
  slot: Slot;
  thumbnail: any;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-card p-3 flex items-center gap-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground px-2 py-1"
        aria-label="Drag"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <div className="h-14 w-24 rounded border bg-muted overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground">
        {thumbnail?.image_url ? (
          <img src={thumbnail.image_url} alt={thumbnail.alt_text ?? ""} className="h-full w-full object-cover" />
        ) : (
          "no creative"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium truncate">{slot.label}</span>
          <Badge variant="outline" className="font-mono text-[10px]">{slot.slot_key}</Badge>
          {!slot.active && <Badge variant="secondary">inactive</Badge>}
          {thumbnail?.kind === "placeholder" && <Badge variant="secondary">placeholder</Badge>}
          {thumbnail?.kind === "advertiser" && <Badge className="bg-emerald-500 text-white">advertiser</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {slot.min_width}×{slot.min_height}px
          {slot.aspect_ratio ? ` · ${slot.aspect_ratio}` : ""} ·{" "}
          {(slot.max_bytes / 1024 / 1024).toFixed(1)}MB max · pos {slot.position}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onEdit}>
        <Pencil className="h-3 w-3 mr-1" /> Edit
      </Button>
    </div>
  );
}
