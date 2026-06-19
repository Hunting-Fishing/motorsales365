import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  X,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Ban,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { upsertQrAdTemplate } from "@/lib/share-kit-templates.functions";
import { detectQrSlotFromBlob, isDetected } from "@/lib/qr-ads/detect-qr-slot";
import { assessQrReadability } from "@/lib/qr-ads/qr-readability";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

type Status = "pending" | "uploading" | "done" | "error" | "cancelled";

type Item = {
  id: string;
  file: File;
  preview: string;
  label: string;
  width: number;
  height: number;
  status: Status;
  progress: number; // 0-100
  error?: string;
  qrCx: number;
  qrCy: number;
  qrSize: number;
  qrDetected: boolean;
  readable: boolean;
  readabilityReasons: string[];
  modulePx: number;
  contrast: number;
};

const ACCEPT = "image/png,image/jpeg,image/webp";
const QR_DEFAULTS = { cx: 0.85, cy: 0.85, size: 0.18 };
const BUCKET = "share-kit-templates";

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

// XHR-based upload via a Supabase signed upload URL so we get real progress + cancel.
async function uploadWithProgress(args: {
  path: string;
  file: File;
  onProgress: (pct: number) => void;
  signal: AbortSignal;
}): Promise<void> {
  const { path, file, onProgress, signal } = args;
  const signed = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data) throw signed.error ?? new Error("Could not get upload URL");
  const { signedUrl, token } = signed.data;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));

    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export function QrAdTemplateUpload({ open, onOpenChange, onSaved }: Props) {
  const upsertFn = useServerFn(upsertQrAdTemplate);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Per-item AbortControllers for in-flight uploads
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  // Global cancel: when true, the loop stops launching new uploads
  const cancelAllRef = useRef(false);

  const updateItem = useCallback((id: string, patch: Partial<Item>) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

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
        const slot = await detectQrSlotFromBlob(f);
        const placement = isDetected(slot)
          ? { cx: slot.cx, cy: slot.cy, size: slot.size }
          : { ...QR_DEFAULTS };
        // Use a representative referral link to estimate QR version + module
        // count. Real per-user links are the same length pattern, so the
        // readability check is accurate at upload time.
        const sampleLink = "https://365motorsales.com/r/ABCDEFGH";
        const report = await assessQrReadability({
          link: sampleLink,
          template: {
            width: w,
            height: h,
            qr: { cx: placement.cx, cy: placement.cy, size: placement.size, platePadding: 0 },
            background: "#ffffff",
          },
          placement,
          baseImageSrc: f,
        }).catch(() => null);
        next.push({
          id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          preview: url,
          label: fileToLabel(f.name),
          width: w,
          height: h,
          status: "pending",
          progress: 0,
          qrCx: slot.cx,
          qrCy: slot.cy,
          qrSize: slot.size,
          qrDetected: isDetected(slot),
          readable: report?.ok ?? true,
          readabilityReasons: report?.reasons ?? [],
          modulePx: report?.modulePx ?? 0,
          contrast: report?.contrast ?? 0,
        });
      } catch {
        toast.error(`Skipped ${f.name} (could not read image).`);
      }
    }
    setItems((prev) => [...prev, ...next]);
  }, []);

  function removeItem(id: string) {
    // If currently uploading, abort first
    const ctrl = controllersRef.current.get(id);
    if (ctrl) ctrl.abort();
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it) URL.revokeObjectURL(it.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  function cancelItem(id: string) {
    const ctrl = controllersRef.current.get(id);
    if (ctrl) ctrl.abort();
    updateItem(id, { status: "cancelled", progress: 0, error: undefined });
  }

  function retryItem(id: string) {
    updateItem(id, { status: "pending", progress: 0, error: undefined });
  }

  function clearFinished() {
    setItems((prev) => {
      prev.filter((i) => i.status === "done").forEach((i) => URL.revokeObjectURL(i.preview));
      return prev.filter((i) => i.status !== "done");
    });
  }

  function reset() {
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current.clear();
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

    const controller = new AbortController();
    controllersRef.current.set(it.id, controller);

    try {
      await uploadWithProgress({
        path,
        file: it.file,
        signal: controller.signal,
        onProgress: (pct) => updateItem(it.id, { progress: pct }),
      });

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      await upsertFn({
        data: {
          slug: `${slug}-${Date.now()}`,
          label: it.label.trim() || "Untitled",
          description: null,
          image_url: pub.publicUrl,
          width: it.width,
          height: it.height,
          qr_cx: it.qrDetected ? it.qrCx : QR_DEFAULTS.cx,
          qr_cy: it.qrDetected ? it.qrCy : QR_DEFAULTS.cy,
          qr_size: it.qrDetected ? it.qrSize : QR_DEFAULTS.size,
          sort_order: 0,
          active: true,
        },
      });
    } finally {
      controllersRef.current.delete(it.id);
    }
  }

  async function handleUploadAll() {
    const pending = items.filter((i) => i.status === "pending" || i.status === "error" || i.status === "cancelled");
    if (pending.length === 0) {
      toast.error("Add at least one image to upload.");
      return;
    }
    cancelAllRef.current = false;
    setBusy(true);
    let success = 0;
    let failed = 0;
    let cancelled = 0;
    for (const it of pending) {
      if (cancelAllRef.current) {
        cancelled++;
        updateItem(it.id, { status: "cancelled", progress: 0 });
        continue;
      }
      updateItem(it.id, { status: "uploading", progress: 0, error: undefined });
      try {
        await uploadOne(it);
        success++;
        updateItem(it.id, { status: "done", progress: 100 });
      } catch (e: any) {
        if (e?.name === "AbortError") {
          cancelled++;
          updateItem(it.id, { status: "cancelled", progress: 0 });
        } else {
          failed++;
          updateItem(it.id, { status: "error", progress: 0, error: e?.message ?? "Upload failed" });
        }
      }
    }
    setBusy(false);
    cancelAllRef.current = false;
    if (success > 0) {
      toast.success(
        `Uploaded ${success} template${success === 1 ? "" : "s"}` +
          (failed ? ` · ${failed} failed` : "") +
          (cancelled ? ` · ${cancelled} cancelled` : ""),
      );
      onSaved();
    } else if (failed > 0) {
      toast.error(`${failed} upload${failed === 1 ? "" : "s"} failed — retry below.`);
    }
    if (success > 0 && failed === 0 && cancelled === 0) {
      reset();
      onOpenChange(false);
    }
  }

  function cancelAll() {
    cancelAllRef.current = true;
    controllersRef.current.forEach((c) => c.abort());
  }

  function handleClose(v: boolean) {
    if (busy) return;
    if (!v) reset();
    onOpenChange(v);
  }

  const pendingCount = items.filter(
    (i) => i.status === "pending" || i.status === "error" || i.status === "cancelled",
  ).length;
  const total = items.length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const inFlight = items.filter((i) => i.status === "uploading").length;
  const overall =
    total === 0
      ? 0
      : Math.round(
          items.reduce((acc, i) => {
            if (i.status === "done") return acc + 100;
            if (i.status === "uploading") return acc + i.progress;
            return acc;
          }, 0) / total,
        );

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
            if (!busy) addFiles(e.dataTransfer.files);
          }}
          onClick={() => !busy && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!busy && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
          }}
          aria-disabled={busy}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/30"
          } ${busy ? "pointer-events-none opacity-60" : ""}`}
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
          <div className="space-y-2">
            {(busy || doneCount > 0) && (
              <div className="rounded-md border border-border bg-muted/30 p-2">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {busy
                      ? `Uploading ${inFlight ? "1 of " : ""}${pendingCount + doneCount} · ${doneCount} done`
                      : `${doneCount} of ${total} uploaded`}
                  </span>
                  <span className="tabular-nums">{overall}%</span>
                </div>
                <Progress value={overall} className="h-1.5" />
              </div>
            )}

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
                      onChange={(e) => updateItem(it.id, { label: e.target.value })}
                      disabled={busy || it.status === "done" || it.status === "uploading"}
                      placeholder="Template name"
                      className="h-8 text-sm"
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{it.width} × {it.height}px</span>
                      {it.qrDetected ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> QR auto-fit
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          title="No white panel found — using default placement. You can fine-tune from the card after upload."
                        >
                          <AlertCircle className="h-3 w-3" /> QR default
                        </span>
                      )}
                      {!it.readable && (
                        <span
                          className="flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          title={it.readabilityReasons.join("\n")}
                        >
                          <AlertCircle className="h-3 w-3" /> QR may not scan
                        </span>
                      )}
                      {it.status === "uploading" && (
                        <span className="flex items-center gap-1 text-primary">
                          <Loader2 className="h-3 w-3 animate-spin" /> {it.progress}%
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
                      {it.status === "cancelled" && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Ban className="h-3 w-3" /> cancelled
                        </span>
                      )}
                    </div>
                    {(it.status === "uploading" || (it.status === "done" && busy)) && (
                      <Progress value={it.progress} className="mt-1.5 h-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {it.status === "uploading" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelItem(it.id)}
                        aria-label="Cancel upload"
                      >
                        <Ban className="mr-1 h-3.5 w-3.5" /> Cancel
                      </Button>
                    )}
                    {(it.status === "error" || it.status === "cancelled") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryItem(it.id)}
                        disabled={busy}
                        aria-label="Retry upload"
                      >
                        <RotateCw className="mr-1 h-3.5 w-3.5" /> Retry
                      </Button>
                    )}
                    {it.status !== "uploading" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(it.id)}
                        disabled={busy && it.status !== "done"}
                        aria-label="Remove"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {doneCount > 0 && !busy && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFinished}>
                  Clear finished
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {busy ? (
            <Button variant="outline" onClick={cancelAll}>
              <Ban className="mr-1 h-4 w-4" /> Cancel all
            </Button>
          ) : (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Close
            </Button>
          )}
          <Button onClick={handleUploadAll} disabled={busy || pendingCount === 0}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            {busy
              ? "Uploading…"
              : pendingCount > 1
                ? `Upload ${pendingCount} templates`
                : "Upload template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
