import { useRef, useState, useEffect } from "react";
import { confirm } from "@/components/ui/confirm-dialog";
import { Upload, Trash2, Star, StarOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uploadWithRetry } from "@/lib/storage-upload";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Photo = { id: string; url: string; storage_path: string | null; sort_order: number };

function SortablePhoto({
  photo,
  isCover,
  onMakeCover,
  onRemove,
}: {
  photo: Photo;
  isCover: boolean;
  onMakeCover: (p: Photo) => void;
  onRemove: (p: Photo) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted touch-none"
    >
      <img src={photo.url} alt="Ride photo" className="h-full w-full object-cover" draggable={false} />

      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1.5 z-[2] cursor-grab rounded-full bg-white/90 p-1.5 text-foreground opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="pointer-events-none absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onMakeCover(photo)}
          className="pointer-events-auto rounded-full bg-white/90 p-1.5 text-foreground hover:bg-white"
          title={isCover ? "Cover photo" : "Make cover"}
          aria-label={isCover ? "Current cover photo" : "Make this the cover photo"}
        >
          {isCover ? (
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
          ) : (
            <StarOff className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onRemove(photo)}
          className="pointer-events-auto rounded-full bg-destructive/90 p-1.5 text-destructive-foreground hover:bg-destructive"
          aria-label="Remove photo"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {isCover && (
        <div className="absolute right-1.5 top-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
          Cover
        </div>
      )}
    </div>
  );
}

export function RidePhotoUploader({
  rideId,
  userId,
  photos,
  coverUrl,
  onChange,
}: {
  rideId: string;
  userId: string;
  photos: Photo[];
  coverUrl: string | null;
  onChange: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Photo[]>(photos);

  // Keep local order in sync with incoming photos (e.g. after upload/delete refetch).
  useEffect(() => {
    setItems([...photos].sort((a, b) => a.sort_order - b.sort_order));
  }, [photos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${rideId}/${crypto.randomUUID()}.${ext}`;
        const { publicUrl } = await uploadWithRetry({
          bucket: "ride-media",
          path,
          file,
          contentType: file.type,
        });
        const { error } = await supabase.from("ride_photos").insert({
          ride_id: rideId,
          url: publicUrl,
          storage_path: path,
          sort_order: items.length,
        });
        if (error) throw error;
      }
      onChange();
      toast.success("Photos uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (p: Photo) => {
    if (!(await confirm({ title: "Remove this photo?", destructive: true }))) return;
    await supabase.from("ride_photos").delete().eq("id", p.id);
    if (p.storage_path) await supabase.storage.from("ride-media").remove([p.storage_path]);
    onChange();
  };

  const makeCover = async (p: Photo) => {
    await supabase.from("rides").update({ cover_photo_url: p.url }).eq("id", rideId);
    onChange();
    toast.success("Cover updated");
  };

  const persistOrder = async (next: Photo[]) => {
    // Optimistic: state already updated. Push sort_order updates in parallel.
    const updates = next.map((p, idx) =>
      supabase.from("ride_photos").update({ sort_order: idx }).eq("id", p.id),
    );
    const results = await Promise.all(updates);
    const firstError = results.find((r) => r?.error)?.error;
    if (firstError) {
      toast.error(firstError.message ?? "Failed to save order");
      onChange(); // resync from server
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((p) => p.id === active.id);
    const newIndex = items.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex).map((p, i) => ({ ...p, sort_order: i }));
    setItems(next);
    void persistOrder(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {busy ? "Uploading…" : "Upload photos"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Drag photos to reorder. Tap the star to set the cover.
        </p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No photos yet
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((p) => (
                <SortablePhoto
                  key={p.id}
                  photo={p}
                  isCover={coverUrl === p.url}
                  onMakeCover={makeCover}
                  onRemove={remove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
