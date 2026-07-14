import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toJpeg } from "html-to-image";
import { Camera, Loader2, Pin, Trash2, Upload, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FEATURES } from "@/data/features-catalog";
import {
  deleteFeatureScreenshot,
  listLatestFeatureScreenshots,
  pinFeatureScreenshot,
  uploadFeatureScreenshot,
} from "@/lib/feature-screenshots.functions";

export const Route = createFileRoute("/_authenticated/admin/feature-screenshots")({
  component: AdminFeatureScreenshotsPage,
  loader: async () => {
    const { screenshots } = await listLatestFeatureScreenshots();
    return { screenshots };
  },
  head: () => ({ meta: [{ title: "Feature screenshots — Admin" }] }),
});

type Status = { kind: "idle" } | { kind: "busy"; step?: string } | { kind: "ok"; msg: string } | { kind: "err"; msg: string };

const CAPTURE_WIDTH = 1440;
const CAPTURE_HEIGHT = 900;

function AdminFeatureScreenshotsPage() {
  const { screenshots: initial } = Route.useLoaderData();
  const [screenshots, setScreenshots] = useState(initial);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const upload = useServerFn(uploadFeatureScreenshot);
  const remove = useServerFn(deleteFeatureScreenshot);
  const pin = useServerFn(pinFeatureScreenshot);
  const reload = useServerFn(listLatestFeatureScreenshots);

  const refresh = async () => {
    const { screenshots: next } = await reload();
    setScreenshots(next);
  };

  const setFeatureStatus = (id: string, s: Status) => setStatus((prev) => ({ ...prev, [id]: s }));

  /**
   * Capture a route in the admin's browser using an off-screen same-origin
   * iframe rendered at 1440x900, then snapshot it with html-to-image.
   */
  const captureInBrowser = async (route: string): Promise<{ base64: string; contentType: string }> => {
    const stage = stageRef.current;
    if (!stage) throw new Error("Capture stage not ready");

    const iframe = document.createElement("iframe");
    iframe.style.width = `${CAPTURE_WIDTH}px`;
    iframe.style.height = `${CAPTURE_HEIGHT}px`;
    iframe.style.border = "0";
    iframe.setAttribute("title", "capture-stage");
    // Signal to the app that this is a screenshot render (can be used to hide banners).
    iframe.src = `${route}${route.includes("?") ? "&" : "?"}__screenshot=1`;
    stage.appendChild(iframe);

    try {
      // Wait for iframe load
      await new Promise<void>((resolve, reject) => {
        const to = setTimeout(() => reject(new Error("Iframe load timed out")), 20_000);
        iframe.addEventListener(
          "load",
          () => {
            clearTimeout(to);
            resolve();
          },
          { once: true },
        );
      });

      // Give the page a beat to hydrate + fetch data
      await new Promise((r) => setTimeout(r, 2500));

      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) throw new Error("Cannot access iframe document");
      const target = doc.documentElement;

      const dataUrl = await toJpeg(target, {
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
        quality: 0.85,
        backgroundColor: "#ffffff",
      });

      const comma = dataUrl.indexOf(",");
      return {
        base64: dataUrl.slice(comma + 1),
        contentType: "image/jpeg",
      };
    } finally {
      stage.removeChild(iframe);
    }
  };

  const runCapture = async (featureId: string, route: string) => {
    setFeatureStatus(featureId, { kind: "busy", step: "Rendering page…" });
    try {
      const { base64, contentType } = await captureInBrowser(route);
      setFeatureStatus(featureId, { kind: "busy", step: "Uploading…" });
      const r = await upload({ data: { featureId, route, contentType, base64 } });
      setFeatureStatus(featureId, {
        kind: "ok",
        msg: (r as any)?.skipped ? "Unchanged" : "Captured",
      });
      await refresh();
    } catch (e) {
      setFeatureStatus(featureId, { kind: "err", msg: (e as Error).message });
    }
  };

  const runUpload = async (featureId: string, route: string, file: File) => {
    setFeatureStatus(featureId, { kind: "busy", step: "Uploading…" });
    try {
      const base64 = await fileToBase64(file);
      await upload({ data: { featureId, route, contentType: file.type, base64 } });
      setFeatureStatus(featureId, { kind: "ok", msg: "Uploaded" });
      await refresh();
    } catch (e) {
      setFeatureStatus(featureId, { kind: "err", msg: (e as Error).message });
    }
  };

  const runDelete = async (featureId: string, id: string) => {
    if (!confirm("Delete this screenshot?")) return;
    setFeatureStatus(featureId, { kind: "busy" });
    try {
      await remove({ data: { id } });
      setFeatureStatus(featureId, { kind: "ok", msg: "Deleted" });
      await refresh();
    } catch (e) {
      setFeatureStatus(featureId, { kind: "err", msg: (e as Error).message });
    }
  };

  const runPin = async (featureId: string, id: string, pinned: boolean) => {
    setFeatureStatus(featureId, { kind: "busy" });
    try {
      await pin({ data: { id, pinned } });
      setFeatureStatus(featureId, { kind: "ok", msg: pinned ? "Pinned" : "Unpinned" });
      await refresh();
    } catch (e) {
      setFeatureStatus(featureId, { kind: "err", msg: (e as Error).message });
    }
  };

  const runCaptureAll = async () => {
    setBulkRunning(true);
    try {
      for (const f of routable) {
        // eslint-disable-next-line no-await-in-loop
        await runCapture(f.id, f.route as string);
      }
    } finally {
      setBulkRunning(false);
    }
  };

  const routable = FEATURES.filter((f) => !!f.route);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2">Admin</Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Feature screenshots
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Capture the app's actual pages directly from your browser (no
            external API needed). Screenshots are versioned — every capture is
            saved so we can see how the app has evolved. Deletes are permanent.
          </p>
        </div>
        <Button onClick={runCaptureAll} disabled={bulkRunning} size="lg">
          {bulkRunning ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="mr-1 h-4 w-4" />
          )}
          Capture all
        </Button>
      </div>

      {/* Off-screen capture stage — iframe is mounted here during capture */}
      <div
        ref={stageRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-99999px",
          top: 0,
          width: `${CAPTURE_WIDTH}px`,
          height: `${CAPTURE_HEIGHT}px`,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {routable.map((f) => {
          const shot = screenshots[f.id];
          const s = status[f.id];
          return (
            <Card key={f.id} className="overflow-hidden">
              <div className="relative aspect-[16/10] w-full bg-secondary/40">
                {shot?.url ? (
                  <img src={shot.url} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No capture yet
                  </div>
                )}
                {shot?.is_pinned && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <Pin className="h-2.5 w-2.5" /> pinned
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{f.name}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">{f.route}</div>
                  </div>
                  {shot?.captured_at && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(shot.captured_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runCapture(f.id, f.route as string)}
                    disabled={s?.kind === "busy" || bulkRunning}
                  >
                    {s?.kind === "busy" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1">Capture</span>
                  </Button>

                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-card px-2.5 py-1 text-xs font-medium hover:bg-secondary">
                    <Upload className="h-3.5 w-3.5" /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) runUpload(f.id, f.route as string, file);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {shot && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => runPin(f.id, shot.id, !shot.is_pinned)}
                      >
                        <Pin className={`h-3.5 w-3.5 ${shot.is_pinned ? "fill-primary text-primary" : ""}`} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => runDelete(f.id, shot.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>

                {s && s.kind !== "idle" && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1 text-[11px] ${
                      s.kind === "err"
                        ? "text-destructive"
                        : s.kind === "ok"
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                    }`}
                  >
                    {s.kind === "err" ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : s.kind === "ok" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    <span className="line-clamp-1">
                      {s.kind === "busy" ? s.step ?? "Working…" : s.msg}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
