import { useEffect, useRef, useState } from "react";
import { Download, Share2, Copy, Facebook, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canNativeShare } from "@/lib/share";
import { composeTemplate, canvasToBlob } from "@/lib/share-kit/compose";
import type { ShareTemplate, TemplateContext } from "@/lib/share-kit/types";
import { interpolate } from "@/lib/share-kit/types";

interface Props {
  template: ShareTemplate;
  context: TemplateContext;
}

export function TemplateCard({ template, context }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    (async () => {
      try {
        const canvas = await composeTemplate(template, context);
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
  }, [template, context]);

  const fileName = `365-${template.id}-${context.code}.png`;
  const shareText = interpolate(template.shareText, context);

  async function getBlob(): Promise<Blob | null> {
    if (!canvasRef.current) {
      try {
        const canvas = await composeTemplate(template, context);
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
      if ((e as Error)?.name !== "AbortError") {
        toast.error("Share failed");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(context.link);
    toast.success("Link copied");
  }

  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(context.link)}&quote=${encodeURIComponent(shareText)}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${context.link}`)}`;

  const aspect = template.height / template.width;

  return (
    <Card className="overflow-hidden">
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
      <div className="space-y-3 p-4">
        <div>
          <div className="font-display text-base font-bold">{template.label}</div>
          <p className="text-xs text-muted-foreground">{template.description}</p>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {template.width} × {template.height}px
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleDownload} disabled={busy || !previewUrl}>
            <Download className="mr-1 h-4 w-4" aria-hidden="true" /> Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNativeShare}
            disabled={busy || !previewUrl}
          >
            <Share2 className="mr-1 h-4 w-4" aria-hidden="true" /> Share
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="mr-1 h-4 w-4" aria-hidden="true" /> Copy link
          </Button>
          <a href={fbHref} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost" aria-label="Share on Facebook" title="Share on Facebook">
              <Facebook className="h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
          <a href={waHref} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost" aria-label="Share on WhatsApp" title="Share on WhatsApp">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}
