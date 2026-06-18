import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, X, ImagePlus, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { upsertShareKitCustomTemplate } from "@/lib/share-kit-templates.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

type Status = "pending" | "uploading" | "done" | "error";

type Item = {
  id: string;
  file: File;
  preview: string;
  label: string;
  width: number;
  height: number;
  status: Status;
  error?: string;
};

const ACCEPT = "image/png,image/jpeg,image/webp";
const QR_DEFAULTS = { cx: 0.85, cy: 0.85, size: 0.18 };

function fileToLabel(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 80) || "Untitled";
}

function readDims(file: File): Promise<{ w: number; h: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export function ShareKitTemplateUpload({ open, onOpenChange, onSaved }: Props) {
  const upsertFn = useServerFn(upsertShareKitCustomTemplate);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) {
      toast.error("Please drop image files (PNG, JPG, or WEBP).");
      return;
    }
    const next: Item[] = [];
    for (const f of arr) {
      try {
        const { w, h, url } = await readDims(f);
        next.push({
          id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          preview: url,
          label: fileToLabel(f.name),
          width: w,
          height: h,
          status: "pending",
        });
      } catch {
        toast.error(`Skipped ${f.name} (could not read image).`);
      }
    }
    setItems((prev) => [...prev, ...next]);
  }, []);

  function removeItem(id: string) {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it) URL.revokeObjectURL(it.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  function reset() {
    items.forEach((i) => URL.revokeObjectURL(i.preview));
    setItems([]);
  }

  async function uploadOne(it: Item) {
    const slug =
      it.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || `tpl-${Date.now()}`;
    const ext = (it.file.name.split(".").pop() || "png").toLowerCase();
    const path = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const up = await supabase.storage.from("share-kit-templates").upload(path, it.file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: it.file.type || "image/png",
    });
    if (up.error) throw up.error;
    const { data: pub } = supabase.storage.from("share-kit-templates").getPublicUrl(path);
    await upsertFn({
      data: {
        slug: `${slug}-${Date.now()}`,
        label: it.label.trim() || "Untitled",
        description: null,
        image_url: pub.publicUrl,
        width: it.width,
        height: it.height,
        qr_cx: QR_DEFAULTS.cx,
        qr_cy: QR_DEFAULTS.cy,
        qr_size: QR_DEFAULTS.size,
        sort_order: 0,
        active: true,
      },
    });
  }

  async function handleUploadAll() {
    const pending = items.filter((i) => i.status === "pending" || i.status === "error");
    if (pending.length === 0) {
      toast.error("Add at least one image to upload.");
      return;
    }
    setBusy(true);
    let success = 0;
    let failed = 0;
    for (const it of pending) {
      setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "uploading", error: undefined } : p)));
      try {
        await uploadOne(it);
        success++;
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: "done" } : p)));
      } catch (e: any) {
        failed++;
        setItems((prev) =>
          prev.map((p) => (p.id === it.id ? { ...p, status: "error", error: e?.message ?? "Upload failed" } : p)),
        );
      }
    }
    setBusy(false);
    if (success > 0) {
      toast.success(`Uploaded ${success} template${success === 1 ? "" : "s"}${failed ? ` (${failed} failed)` : ""}`);
      onSaved();
    }
    if (success > 0 && failed === 0) {
      reset();
      onOpenChange(false);
    }
  }

  function handleClose(v: boolean) {
    if (busy) return;
    if (!v) reset();
    onOpenChange(v);
  }

  const pendingCount = items.filter((i) => i.status === "pending" || i.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload share-kit templates</DialogTitle>
          <DialogDescription>
            Drag and drop one or many images. We'll handle the QR placement automatically — you can fine-tune any
            template later from its card.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/30"
          }`}
        >
          <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div className="text-sm font-medium">Drop images here or click to browse</div>
          <div className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WEBP · select multiple to bulk upload</div>
          <Input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
        </div>

        {items.length > 0 && (
          <ul className="grid gap-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
              >
                <img
                  src={it.preview}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Label className="sr-only" htmlFor={`lbl-${it.id}`}>Label</Label>
                  <Input
                    id={`lbl-${it.id}`}
                    value={it.label}
                    onChange={(e) =>
                      setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, label: e.target.value } : p)))
                    }
                    disabled={busy || it.status === "done"}
                    placeholder="Template name"
                    className="h-8 text-sm"
                  />
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{it.width} × {it.height}px</span>
                    {it.status === "uploading" && (
                      <span className="flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" /> uploading…
                      </span>
                    )}
                    {it.status === "done" && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> uploaded
                      </span>
                    )}
                    {it.status === "error" && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3 w-3" /> {it.error ?? "failed"}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(it.id)}
                  disabled={busy}
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleUploadAll} disabled={busy || pendingCount === 0}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            {pendingCount > 1 ? `Upload ${pendingCount} templates` : "Upload template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
