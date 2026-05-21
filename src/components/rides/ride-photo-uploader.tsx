import { useRef, useState } from "react";
import { Upload, Trash2, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uploadWithRetry } from "@/lib/storage-upload";
import { toast } from "sonner";

type Photo = { id: string; url: string; storage_path: string | null; sort_order: number };

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
        const { error } = await (supabase as any).from("ride_photos").insert({
          ride_id: rideId,
          url: publicUrl,
          storage_path: path,
          sort_order: photos.length,
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
    if (!confirm("Remove this photo?")) return;
    await (supabase as any).from("ride_photos").delete().eq("id", p.id);
    if (p.storage_path) await supabase.storage.from("ride-media").remove([p.storage_path]);
    onChange();
  };

  const makeCover = async (p: Photo) => {
    await (supabase as any).from("rides").update({ cover_photo_url: p.url }).eq("id", rideId);
    onChange();
    toast.success("Cover updated");
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
        <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {busy ? "Uploading…" : "Upload photos"}
        </Button>
        <p className="text-xs text-muted-foreground">Tap a star to set the cover photo.</p>
      </div>
      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No photos yet
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((p) => {
            const isCover = coverUrl === p.url;
            return (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => makeCover(p)}
                    className="rounded-full bg-white/90 p-1.5 text-foreground hover:bg-white"
                    title={isCover ? "Cover photo" : "Make cover"}
                  >
                    {isCover ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> : <StarOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="rounded-full bg-destructive/90 p-1.5 text-destructive-foreground hover:bg-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {isCover && (
                  <div className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
