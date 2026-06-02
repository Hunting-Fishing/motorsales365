import { useRef, useState } from "react";
import { confirm } from "@/components/ui/confirm-dialog";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uploadWithRetry } from "@/lib/storage-upload";
import { toast } from "sonner";

export type ServiceLogPhoto = {
  id: string;
  url: string;
  storage_path: string | null;
  sort_order: number;
};

const MAX_PHOTOS = 20;

export function ServiceLogPhotoUploader({
  logId,
  rideId,
  userId,
  photos,
  onChange,
}: {
  logId: string;
  rideId: string;
  userId: string;
  photos: ServiceLogPhoto[];
  onChange: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Max ${MAX_PHOTOS} photos per entry`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      toast.message(`Uploading ${remaining} of ${files.length} (limit ${MAX_PHOTOS})`);
    }
    setBusy(true);
    try {
      let order = photos.length;
      for (const file of list) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/${rideId}/service/${logId}/${crypto.randomUUID()}.${ext}`;
        const { publicUrl } = await uploadWithRetry({
          bucket: "ride-media",
          path,
          file,
          contentType: file.type,
        });
        const { error } = await (supabase as any).from("ride_service_log_photos").insert({
          log_id: logId,
          url: publicUrl,
          storage_path: path,
          sort_order: order++,
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

  const remove = async (p: ServiceLogPhoto) => {
    if (!(await confirm({ title: "Remove this photo?", destructive: true }))) return;
    await (supabase as any).from("ride_service_log_photos").delete().eq("id", p.id);
    if (p.storage_path) await supabase.storage.from("ride-media").remove([p.storage_path]);
    onChange();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
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
          size="sm"
          disabled={busy || photos.length >= MAX_PHOTOS}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-1 h-4 w-4" />
          {busy ? "Uploading…" : "Upload photos"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {photos.length} / {MAX_PHOTOS} photos
        </p>
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {photos.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
            >
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p)}
                className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                aria-label="Remove photo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
