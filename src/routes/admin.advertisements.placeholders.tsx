import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import { ImageIcon, Trash2, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  listAdSlots,
  createPlaceholderCreative,
  updatePlaceholderCreative,
  setAssignmentActive,
  deletePlaceholderCreative,
  reorderAssignments,
} from "@/lib/advertise-slots.functions";

export const Route = createFileRoute("/admin/advertisements/placeholders")({
  component: AdminPlaceholdersPage,
  head: () => ({
    meta: [{ title: "Ad placeholders — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
});

async function readImageMeta(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width: w, height: h });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function AdminPlaceholdersPage() {
  const { isAdmin, canManageAds } = useAuth();
  const hasAccess = isAdmin || canManageAds;
  const [slots, setSlots] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

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
    const m = new Map<string, any[]>();
    for (const s of slots) {
      if (!m.has(s.placement)) m.set(s.placement, []);
      m.get(s.placement)!.push(s);
    }
    return Array.from(m.entries());
  }, [slots]);

  const placeholdersFor = (slotId: string) =>
    assignments
      .filter((a) => a.slot_id === slotId && a.creative?.kind === "placeholder")
      .sort((a, b) => a.position - b.position);

  if (!hasAccess) {
    return <div className="p-6 text-sm text-muted-foreground">Ads manager role required.</div>;
  }

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await updatePlaceholderCreative({
        data: {
          id: editing.id,
          headline: editing.headline ?? null,
          caption: editing.caption ?? null,
          alt_text: editing.alt_text ?? null,
          target_url: editing.target_url || null,
        },
      });
      toast.success("Updated");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5" /> Placeholder creatives
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload default ad images shown in each slot until a paying advertiser ad goes live.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([placement, slotItems]) => (
            <div key={placement} className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{placement}</h3>
              {slotItems.map((slot) => (
                <SlotPanel
                  key={slot.id}
                  slot={slot}
                  placeholders={placeholdersFor(slot.id)}
                  onChanged={load}
                  onEdit={setEditing}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit placeholder</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <Label>Headline</Label>
                <Input
                  value={editing.headline ?? ""}
                  onChange={(e) => setEditing({ ...editing, headline: e.target.value })}
                />
              </div>
              <div>
                <Label>Alt text</Label>
                <Input
                  value={editing.alt_text ?? ""}
                  onChange={(e) => setEditing({ ...editing, alt_text: e.target.value })}
                />
              </div>
              <div>
                <Label>Caption</Label>
                <Input
                  value={editing.caption ?? ""}
                  onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                />
              </div>
              <div>
                <Label>Target URL</Label>
                <Input
                  placeholder="https://…"
                  value={editing.target_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, target_url: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlotPanel({
  slot,
  placeholders,
  onChanged,
  onEdit,
}: {
  slot: any;
  placeholders: any[];
  onChanged: () => void;
  onEdit: (p: any) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const ids = placeholders.map((p) => p.id);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      if (!slot.allowed_mime.includes(file.type)) {
        toast.error(`Type ${file.type} not allowed`);
        return;
      }
      if (file.size > slot.max_bytes) {
        toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(2)}MB > ${(slot.max_bytes / 1024 / 1024).toFixed(2)}MB)`);
        return;
      }
      const meta = await readImageMeta(file);
      if (meta.width < slot.min_width || meta.height < slot.min_height) {
        const ok = confirm(
          `Image is ${meta.width}×${meta.height}px, smaller than required ${slot.min_width}×${slot.min_height}px. Upload anyway?`,
        );
        if (!ok) return;
      }
      const ext = file.name.split(".").pop() || "bin";
      const path = `placeholders/${slot.slot_key}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("advertisements")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("advertisements").getPublicUrl(path);
      // Bucket is private; admin/staff read via signed URL. Use a long signed URL for placeholder display.
      const { data: signed, error: sErr } = await supabase.storage
        .from("advertisements")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr) throw sErr;
      await createPlaceholderCreative({
        data: {
          slot_id: slot.id,
          storage_path: path,
          image_url: signed?.signedUrl ?? pub.publicUrl,
          image_width: meta.width,
          image_height: meta.height,
          file_size_bytes: file.size,
          mime_type: file.type,
          headline: null,
          alt_text: `${slot.label} placeholder`,
          target_url: null,
        },
      });
      toast.success("Placeholder uploaded");
      onChanged();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const newIds = arrayMove(ids, oldIdx, newIdx);
    try {
      await reorderAssignments({ data: { slot_id: slot.id, orderedIds: newIds } });
      onChanged();
    } catch (err: any) {
      toast.error(err.message ?? "Reorder failed");
    }
  };

  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{slot.label}</span>
            <Badge variant="outline" className="font-mono text-[10px]">{slot.slot_key}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            requires {slot.min_width}×{slot.min_height}px
            {slot.aspect_ratio ? ` · ${slot.aspect_ratio}` : ""} ·{" "}
            {(slot.max_bytes / 1024 / 1024).toFixed(1)}MB max ·{" "}
            {slot.allowed_mime.join(", ")}
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={slot.allowed_mime.join(",")}
            hidden
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
            Upload placeholder
          </Button>
        </div>
      </div>

      {placeholders.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No placeholders yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="grid gap-2">
              {placeholders.map((p) => (
                <PlaceholderRow key={p.id} item={p} onChanged={onChanged} onEdit={() => onEdit(p.creative)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function PlaceholderRow({
  item,
  onChanged,
  onEdit,
}: {
  item: any;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const cr = item.creative;

  const toggleActive = async () => {
    try {
      await setAssignmentActive({ data: { id: item.id, active: !item.active } });
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this placeholder?")) return;
    try {
      await deletePlaceholderCreative({ data: { id: cr.id } });
      toast.success("Deleted");
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded border bg-background p-2 flex items-center gap-3">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground px-1" aria-label="Drag">
        ⋮⋮
      </button>
      <img
        src={cr.image_url}
        alt={cr.alt_text ?? ""}
        className="h-12 w-20 object-cover rounded border bg-muted"
      />
      <div className="flex-1 min-w-0 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium truncate">{cr.headline || "—"}</span>
          {cr.spec_ok ? (
            <Badge className="bg-emerald-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> spec ok</Badge>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="gap-1 cursor-help">
                    <AlertCircle className="h-3 w-3" /> spec warn
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <ul className="list-disc pl-3 text-xs">
                    {(cr.spec_errors ?? []).map((e: string, i: number) => <li key={i}>{e}</li>)}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-muted-foreground truncate">
          {cr.image_width}×{cr.image_height}px · {(cr.file_size_bytes / 1024).toFixed(0)}KB · pos {item.position}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={!!item.active} onCheckedChange={toggleActive} />
        <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}
