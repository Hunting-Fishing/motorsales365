import { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { composeBaseOnly } from "@/lib/share-kit/compose";
import type { ShareTemplate, TemplateContext } from "@/lib/share-kit/types";
import type { QrOverride } from "@/lib/share-kit/compose";

interface Props {
  template: ShareTemplate;
  context: TemplateContext;
  initial: QrOverride;
  defaults: QrOverride;
  onSave: (v: QrOverride) => void;
  onReset: () => void;
  onCancel: () => void;
  saving?: boolean;
}

const MIN_SIZE = 0.08;
const MAX_SIZE = 0.6;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function TemplateEditor({
  template,
  context,
  initial,
  defaults,
  onSave,
  onReset,
  onCancel,
  saving,
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [pos, setPos] = useState<QrOverride>(initial);
  const dragRef = useRef<{ mode: "move" | "resize"; sx: number; sy: number; start: QrOverride } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const canvas = await composeBaseOnly(template, context);
        if (!cancelled) setBaseUrl(canvas.toDataURL("image/png"));
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [template, context]);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(context.link, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 512,
      color: { dark: "#0b2a6b", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [context.link]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    const stage = stageRef.current;
    if (!d || !stage) return;
    const rect = stage.getBoundingClientRect();
    const dxRel = (e.clientX - d.sx) / rect.width;
    const dyRel = (e.clientY - d.sy) / rect.height;
    if (d.mode === "move") {
      const half = d.start.size / 2;
      const aspect = template.width / template.height;
      const halfY = (d.start.size / 2) * aspect;
      setPos({
        cx: clamp(d.start.cx + dxRel, half, 1 - half),
        cy: clamp(d.start.cy + dyRel, halfY, 1 - halfY),
        size: d.start.size,
      });
    } else {
      const delta = (dxRel + dyRel) / 2;
      const next = clamp(d.start.size + delta * 1.4, MIN_SIZE, MAX_SIZE);
      const half = next / 2;
      const aspect = template.width / template.height;
      const halfY = (next / 2) * aspect;
      setPos({
        cx: clamp(d.start.cx, half, 1 - half),
        cy: clamp(d.start.cy, halfY, 1 - halfY),
        size: next,
      });
    }
  }, [template.width, template.height]);

  const stopDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDrag);
    window.removeEventListener("pointercancel", stopDrag);
  }, [onPointerMove]);

  function startDrag(mode: "move" | "resize", e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, sx: e.clientX, sy: e.clientY, start: pos };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  }

  useEffect(() => () => stopDrag(), [stopDrag]);

  function onKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 0.05 : 0.01;
    const aspect = template.width / template.height;
    const halfX = pos.size / 2;
    const halfY = (pos.size / 2) * aspect;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPos((p) => ({ ...p, cx: clamp(p.cx - step, halfX, 1 - halfX) }));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPos((p) => ({ ...p, cx: clamp(p.cx + step, halfX, 1 - halfX) }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPos((p) => ({ ...p, cy: clamp(p.cy - step, halfY, 1 - halfY) }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setPos((p) => ({ ...p, cy: clamp(p.cy + step, halfY, 1 - halfY) }));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setPos((p) => ({ ...p, size: clamp(p.size + step, MIN_SIZE, MAX_SIZE) }));
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setPos((p) => ({ ...p, size: clamp(p.size - step, MIN_SIZE, MAX_SIZE) }));
    }
  }

  const aspect = template.height / template.width;
  const qrPctW = pos.size * 100;
  const qrPctH = pos.size * (template.width / template.height) * 100;
  const qrLeftPct = (pos.cx - pos.size / 2) * 100;
  const qrTopPct = (pos.cy - (pos.size / 2) * (template.width / template.height)) * 100;

  return (
    <div className="space-y-3">
      <div className="bg-muted/30 p-3">
        <div
          ref={stageRef}
          className="relative w-full overflow-hidden rounded-md border border-border bg-white touch-none select-none"
          style={{ paddingTop: `${aspect * 100}%` }}
        >
          {baseUrl ? (
            <img
              src={baseUrl}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Loading template…
            </div>
          )}
          {qrUrl && (
            <div
              role="application"
              tabIndex={0}
              aria-label={`QR position. Arrow keys move, plus and minus resize. Current position ${(pos.cx * 100).toFixed(0)}% across, ${(pos.cy * 100).toFixed(0)}% down, size ${(pos.size * 100).toFixed(0)}% of width.`}
              onPointerDown={(e) => startDrag("move", e)}
              onKeyDown={onKey}
              className="absolute cursor-move rounded bg-white/95 shadow-lg ring-2 ring-primary outline-none focus-visible:ring-4 focus-visible:ring-primary/60"
              style={{
                left: `${qrLeftPct}%`,
                top: `${qrTopPct}%`,
                width: `${qrPctW}%`,
                height: `${qrPctH}%`,
              }}
            >
              <img
                src={qrUrl}
                alt=""
                draggable={false}
                className="h-full w-full object-contain pointer-events-none"
              />
              <button
                type="button"
                aria-label="Resize QR (drag)"
                onPointerDown={(e) => startDrag("resize", e)}
                className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-full border-2 border-primary bg-white shadow"
              />
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2 px-1">
        <label className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="w-16 shrink-0">Size</span>
          <Slider
            value={[Math.round(pos.size * 100)]}
            min={Math.round(MIN_SIZE * 100)}
            max={Math.round(MAX_SIZE * 100)}
            step={1}
            onValueChange={(v) =>
              setPos((p) => ({ ...p, size: clamp(v[0] / 100, MIN_SIZE, MAX_SIZE) }))
            }
            aria-label="QR size"
          />
          <span className="w-10 text-right tabular-nums">{Math.round(pos.size * 100)}%</span>
        </label>
        <p className="text-[11px] text-muted-foreground">
          Drag the QR to position it, use the corner handle to resize, or focus and use arrow / +
          / − keys.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSave(pos)} disabled={saving}>
          {saving ? "Saving…" : "Save layout"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setPos(defaults);
            onReset();
            toast.success("Reset to default");
          }}
          disabled={saving}
        >
          Reset to default
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
