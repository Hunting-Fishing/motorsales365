import { useEffect, useRef, useState } from "react";
import { Download, Share2, Copy, Facebook, MessageCircle, SlidersHorizontal, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

// Global concurrency limiter so 50+ cards don't all decode/compose at once.
let activeRenders = 0;
const renderQueue: Array<() => void> = [];
const MAX_CONCURRENT_RENDERS = 4;
function acquireRenderSlot(): Promise<void> {
  return new Promise((resolve) => {
    const tryRun = () => {
      if (activeRenders < MAX_CONCURRENT_RENDERS) {
        activeRenders++;
        resolve();
      } else {
        renderQueue.push(tryRun);
      }
    };
    tryRun();
  });
}
function releaseRenderSlot() {
  activeRenders = Math.max(0, activeRenders - 1);
  const next = renderQueue.shift();
  if (next) next();
}

export function TemplateCard({ template, context, override }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertShareKitLayout);
  const deleteFn = useServerFn(deleteShareKitLayout);

  const defaults: QrOverride = {
    cx: template.qr.cx,
    cy: template.qr.cy,
    size: template.qr.size,
  };
  const effective: QrOverride = override ?? defaults;

  // Lazy render: only compose when the card scrolls into view.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let released = false;
    setPreviewUrl(null);
    (async () => {
      await acquireRenderSlot();
      if (cancelled) {
        releaseRenderSlot();
        released = true;
        return;
      }
      try {
        const canvas = await composeTemplate(template, context, effective);
        if (cancelled) return;
        canvasRef.current = canvas;
        setPreviewUrl(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error("Template render failed", template.id, e);
        if (!cancelled) toast.error(`Could not render ${template.label}`);
      } finally {
        if (!released) releaseRenderSlot();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, template, context, effective.cx, effective.cy, effective.size]);


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
    <>
    <div ref={containerRef}>
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
        <button
          type="button"
          onClick={() => previewUrl && setZoomOpen(true)}
          className="block w-full bg-muted/30 p-2 text-left transition hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`Expand preview of ${template.label}`}
        >
          <div
            className="relative w-full overflow-hidden rounded-md border border-border bg-white"
            style={{ paddingTop: `${aspect * 100}%` }}
          >
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt={`Preview of ${template.label} with your personal QR code`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <span className="absolute right-1.5 top-1.5 rounded-md bg-background/80 p-1 text-muted-foreground shadow-sm backdrop-blur-sm">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                Rendering…
              </div>
            )}
          </div>
        </button>
      )}
      <div className="space-y-2 p-2">
        <div>
          <div className="font-display text-xs font-bold leading-tight line-clamp-1">{template.label}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            {template.width}×{template.height}{override ? " · custom" : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button size="icon" variant="default" className="h-7 w-7" onClick={handleDownload} disabled={busy || !previewUrl || editing} aria-label="Download" title="Download">
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleNativeShare} disabled={busy || !previewUrl || editing} aria-label="Share" title="Share">
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button size="icon" variant={editing ? "default" : "outline"} className="h-7 w-7" onClick={() => setEditing((v) => !v)} aria-pressed={editing} aria-label="Edit layout" title="Edit layout">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleCopy} disabled={editing} aria-label="Copy link" title="Copy link">
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <a href={fbHref} target="_blank" rel="noreferrer">
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Share on Facebook" title="Share on Facebook" disabled={editing}>
              <Facebook className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </a>
          <a href={waHref} target="_blank" rel="noreferrer">
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Share on WhatsApp" title="Share on WhatsApp" disabled={editing}>
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
    </div>
    <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] lg:max-w-5xl p-3 sm:p-4">
        <DialogTitle className="text-base">{template.label}</DialogTitle>
        <DialogDescription className="sr-only">Full-size preview of {template.label}</DialogDescription>
        {previewUrl && (
          <div className="flex max-h-[80vh] items-center justify-center overflow-auto bg-muted/20 rounded-md">
            <img
              src={previewUrl}
              alt={`Full-size preview of ${template.label}`}
              className="max-h-[80vh] w-auto object-contain"
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={handleDownload} disabled={busy || !previewUrl}>
            <Download className="mr-1 h-4 w-4" /> Download
          </Button>
          <Button size="sm" variant="outline" onClick={handleNativeShare} disabled={busy || !previewUrl}>
            <Share2 className="mr-1 h-4 w-4" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="mr-1 h-4 w-4" /> Copy link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
