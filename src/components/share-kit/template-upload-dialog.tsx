import { useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { upsertShareKitCustomTemplate } from "@/lib/share-kit-templates.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export function ShareKitTemplateUpload({ open, onOpenChange, onSaved }: Props) {
  const upsertFn = useServerFn(upsertShareKitCustomTemplate);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [qrCx, setQrCx] = useState(0.85);
  const [qrCy, setQrCy] = useState(0.85);
  const [qrSize, setQrSize] = useState(0.18);
  const [busy, setBusy] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setDims(null);
    setLabel("");
    setDescription("");
    setQrCx(0.85);
    setQrCy(0.85);
    setQrSize(0.18);
  }

  function pickFile(f: File | null) {
    setFile(f);
    if (!f) {
      setPreview(null);
      setDims(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }

  async function handleSave() {
    if (!file || !dims || !label.trim()) {
      toast.error("Pick an image and enter a label.");
      return;
    }
    setBusy(true);
    try {
      const slug =
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60) || `tpl-${Date.now()}`;
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${slug}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("share-kit-templates").upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type || "image/png",
      });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("share-kit-templates").getPublicUrl(path);
      await upsertFn({
        data: {
          slug: `${slug}-${Date.now()}`,
          label: label.trim(),
          description: description.trim() || null,
          image_url: pub.publicUrl,
          width: dims.w,
          height: dims.h,
          qr_cx: qrCx,
          qr_cy: qrCy,
          qr_size: qrSize,
          sort_order: 0,
          active: true,
        },
      });
      toast.success("Template uploaded");
      reset();
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload share-kit template</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Image (PNG/JPG)</Label>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {dims && (
              <p className="mt-1 text-xs text-muted-foreground">
                {dims.w} × {dims.h}px
              </p>
            )}
          </div>
          {preview && (
            <div className="relative rounded-md border bg-muted/30 p-2">
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="preview"
                  className="max-h-72 w-auto rounded"
                />
                {dims && (
                  <div
                    className="absolute border-2 border-primary bg-primary/20"
                    style={{
                      left: `${(qrCx - qrSize / 2) * 100}%`,
                      top: `${(qrCy - qrSize / 2) * 100}%`,
                      width: `${qrSize * 100}%`,
                      height: `${qrSize * 100}%`,
                    }}
                    title="QR position preview"
                  />
                )}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Label *</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Rear Shirt Ad" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short note shown under the preview."
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>QR X (0–1)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={qrCx}
                onChange={(e) => setQrCx(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>QR Y (0–1)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={qrCy}
                onChange={(e) => setQrCy(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>QR size (0.05–0.8)</Label>
              <Input
                type="number"
                step="0.01"
                min={0.05}
                max={0.8}
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Position is relative (0,0 = top-left, 1,1 = bottom-right). Each user can fine-tune
            their own QR placement after the template is saved.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy || !file || !label.trim()}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            Upload template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
