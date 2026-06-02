import { useRef, useState } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadWithRetry } from "@/lib/storage-upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  userId: string;
  value: string | null;
  fallback: string;
  onChange: (url: string | null) => void;
};

export function AvatarUploader({ userId, value, fallback, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => fileRef.current?.click();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { publicUrl } = await uploadWithRetry({
        bucket: "avatars",
        path,
        file,
        contentType: file.type,
      });
      onChange(publicUrl);
      toast.success("Avatar updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!value) return;
    onChange(null);
    // Best-effort cleanup of previous file if it's in this user's folder.
    try {
      const marker = `/avatars/${userId}/`;
      const i = value.indexOf(marker);
      if (i >= 0) {
        const objectPath = value.slice(i + "/avatars/".length);
        await supabase.storage.from("avatars").remove([objectPath]);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20 border border-border">
        <AvatarImage src={value ?? undefined} alt="" />
        <AvatarFallback className="text-lg font-semibold">{fallback}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={pick} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            {value ? "Change photo" : "Upload photo"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={remove} disabled={busy}>
              <Trash2 className="mr-2 size-4" /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Max 5MB.</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
