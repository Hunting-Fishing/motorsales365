import { useRef, useState } from "react";
import { Upload, X, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadWithRetry } from "@/lib/storage-upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Uploads a single file to a public Supabase Storage bucket under `<userId>/<prefix>/<uuid>.<ext>`
 * and reports back the public URL via onChange. Optimised for cover photos and receipt files.
 */
export function SingleFileUploader({
  userId,
  bucket,
  prefix,
  value,
  onChange,
  accept = "image/*",
  label = "Upload file",
  variant = "image",
}: {
  userId: string;
  bucket: string;
  prefix: string;
  value: string | null;
  onChange: (url: string | null, path: string | null) => void;
  accept?: string;
  label?: string;
  variant?: "image" | "file";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pathRef, setPathRef] = useState<string | null>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${prefix}/${crypto.randomUUID()}.${ext}`;
      const { publicUrl } = await uploadWithRetry({
        bucket,
        path,
        file,
        contentType: file.type,
      });
      setPathRef(path);
      onChange(publicUrl, path);
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = async () => {
    if (pathRef) {
      try {
        await supabase.storage.from(bucket).remove([pathRef]);
      } catch {
        /* ignore */
      }
    }
    setPathRef(null);
    onChange(null, null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-2">
          {variant === "image" ? (
            <img src={value} alt="Uploaded file preview" className="h-16 w-16 rounded object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="flex-1 truncate text-xs text-primary hover:underline"
          >
            View <ExternalLink className="ml-1 inline h-3 w-3" />
          </a>
          <Button type="button" size="sm" variant="ghost" onClick={handlePick} disabled={busy}>
            Replace
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={clear} disabled={busy}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={handlePick} disabled={busy}>
          <Upload className="mr-2 h-4 w-4" /> {busy ? "Uploading…" : label}
        </Button>
      )}
    </div>
  );
}
