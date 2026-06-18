import { useEffect, useRef, useState } from "react";
import { Download, Share2, Copy, Facebook, MessageCircle, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canNativeShare } from "@/lib/share";
import { composeTemplate, canvasToBlob } from "@/lib/share-kit/compose";
import type { QrOverride } from "@/lib/share-kit/compose";
import type { ShareTemplate, TemplateContext } from "@/lib/share-kit/types";
import { interpolate } from "@/lib/share-kit/types";
import { TemplateEditor } from "./template-editor";
import {
  upsertShareKitLayout,
  deleteShareKitLayout,
} from "@/lib/share-kit-layouts.functions";

interface Props {
  template: ShareTemplate;
  context: TemplateContext;
  override?: QrOverride;
}

export function TemplateCard({ template, context, override }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertShareKitLayout);
  const deleteFn = useServerFn(deleteShareKitLayout);

  const defaults: QrOverride = {
    cx: template.qr.cx,
    cy: template.qr.cy,
    size: template.qr.size,
  };
  const effective: QrOverride = override ?? defaults;

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    (async () => {
      try {
        const canvas = await composeTemplate(template, context, effective);
        if (cancelled) return;
        canvasRef.current = canvas;
        setPreviewUrl(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error("Template render failed", template.id, e);
        if (!cancelled) toast.error(`Could not render ${template.label}`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, context, effective.cx, effective.cy, effective.size]);

  const fileName = `365-${template.id}-${context.code}.png`;
  const shareText = interpolate(template.shareText, context);

  async function getBlob(): Promise<Blob | null> {
    if (!canvasRef.current) {
      try {
        const canvas = await composeTemplate(template, context, effective);
        canvasRef.current = canvas;
      } catch {
        return null;
      }
    }
    return canvasToBlob(canvasRef.current!);
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("no blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Image downloaded");
    } catch {
      toast.error("Could not download image");
    } finally {
      setBusy(false);
    }
  }

  async function handleNativeShare() {
    setBusy(true);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("no blob");
      const file = new File([blob], fileName, { type: "image/png" });
      const data: ShareData = {
        title: "365 Motor Sales",
        text: shareText,
        url: context.link,
        files: [file],
      };
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare(data)) {
        await navigator.share(data);
      } else if (canNativeShare()) {
        await navigator.share({ title: "365 Motor Sales", text: shareText, url: context.link });
      } else {
        await navigator.clipboard.writeText(`${shareText}`);
        toast.success("Caption copied — paste it into your post");
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        // user cancelled — no-op
      } else {
        try {
          await navigator.clipboard.writeText(`${shareText}\n${context.link}`);
          toast.success("Caption + link copied — paste it into your post");
        } catch {
          toast.error("Share failed — try Download or Copy link instead");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(context.link);
    toast.success("Link copied");
  }

  const saveMut = useMutation({
    mutationFn: (v: QrOverride) =>
      upsertFn({ data: { templateId: template.id, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-kit-layouts"] });
      setEditing(false);
      toast.success("Layout saved");
    },
    onError: () => toast.error("Could not save layout"),
  });

  const resetMut = useMutation({
    mutationFn: () => deleteFn({ data: { templateId: template.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-kit-layouts"] });
    },
    onError: () => toast.error("Could not reset layout"),
  });

  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(context.link)}&quote=${encodeURIComponent(shareText)}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${context.link}`)}`;

  const aspect = template.height / template.width;

  return (
    <Card className="overflow-hidden">
      {editing ? (
        <div className="p-3">
          <TemplateEditor
            template={template}
            context={context}
            initial={effective}
            defaults={defaults}
            onSave={(v) => saveMut.mutate(v)}
            onReset={() => resetMut.mutate()}
            onCancel={() => setEditing(false)}
            saving={saveMut.isPending}
          />
        </div>
      ) : (
        <div className="bg-muted/30 p-3">
          <div
            className="relative w-full overflow-hidden rounded-md border border-border bg-white"
            style={{ paddingTop: `${aspect * 100}%` }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Preview of ${template.label} with your personal QR code`}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                Rendering…
              </div>
            )}
          </div>
        </div>
      )}
      <div className="space-y-3 p-4">
        <div>
          <div className="font-display text-base font-bold">{template.label}</div>
          <p className="text-xs text-muted-foreground">{template.description}</p>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {template.width} × {template.height}px{override ? " · custom layout" : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleDownload} disabled={busy || !previewUrl || editing}>
            <Download className="mr-1 h-4 w-4" aria-hidden="true" /> Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNativeShare}
            disabled={busy || !previewUrl || editing}
          >
            <Share2 className="mr-1 h-4 w-4" aria-hidden="true" /> Share
          </Button>
          <Button
            size="sm"
            variant={editing ? "default" : "outline"}
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
          >
            <SlidersHorizontal className="mr-1 h-4 w-4" aria-hidden="true" />
            {editing ? "Close editor" : "Edit layout"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} disabled={editing}>
            <Copy className="mr-1 h-4 w-4" aria-hidden="true" /> Copy link
          </Button>
          <a href={fbHref} target="_blank" rel="noreferrer">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Share on Facebook"
              title="Share on Facebook"
              disabled={editing}
            >
              <Facebook className="h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
          <a href={waHref} target="_blank" rel="noreferrer">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Share on WhatsApp"
              title="Share on WhatsApp"
              disabled={editing}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}
