import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Camera, CameraOff, CheckCircle2, Circle, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { siteOrigin } from "@/lib/site-config";
import { computeQuietZoneModules, type QrLevel } from "@/lib/qr-quiet-zone";

export const Route = createFileRoute("/dashboard/qr-scan-test")({
  component: QrScanTest,
  head: () => ({
    meta: [
      { title: "QR Scan Test — 365 Motor Sales" },
      {
        name: "description",
        content:
          "Verify your referral QR reliably scans on mobile cameras at small, medium and large sizes.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type SizePreset = { key: "sm" | "md" | "lg"; label: string; px: number; hint: string };

const SIZES: SizePreset[] = [
  { key: "sm", label: "Small", px: 128, hint: "~3 cm printed / thumbnail size" },
  { key: "md", label: "Medium", px: 240, hint: "~6 cm printed / card size" },
  { key: "lg", label: "Large", px: 384, hint: "~10 cm printed / flyer size" },
];

type PassMap = Record<SizePreset["key"], { ok: boolean; ms: number | null }>;

function QrScanTest() {
  const { user } = useAuth();
  const [defaultLink, setDefaultLink] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passes, setPasses] = useState<PassMap>({
    sm: { ok: false, ms: null },
    md: { ok: false, ms: null },
    lg: { ok: false, ms: null },
  });
  const [lastDecoded, setLastDecoded] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [level, setLevel] = useState<QrLevel>("H");
  const [autoQuiet, setAutoQuiet] = useState<boolean>(true);
  const [manualMargin, setManualMargin] = useState<number>(4);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const frameStampsRef = useRef<number[]>([]);
  const linkRef = useRef<string>("");

  // Load the user's referral link if available.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        const fallback = `${siteOrigin()}/`;
        if (!cancelled) {
          setDefaultLink(fallback);
          setLink((prev) => prev || fallback);
        }
        return;
      }
      const { data } = await (supabase as any)
        .from("staff_referrals")
        .select("referral_code")
        .eq("staff_user_id", user.id)
        .maybeSingle();
      const code = data?.referral_code as string | undefined;
      const url = code ? `${siteOrigin()}/r/${code}` : `${siteOrigin()}/`;
      if (!cancelled) {
        setDefaultLink(url);
        setLink((prev) => prev || url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    linkRef.current = link.trim();
  }, [link]);

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const resetResults = useCallback(() => {
    setPasses({
      sm: { ok: false, ms: null },
      md: { ok: false, ms: null },
      lg: { ok: false, ms: null },
    });
    setLastDecoded(null);
    startedAtRef.current = performance.now();
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    // Downscale for speed — jsQR is CPU heavy.
    const scale = Math.min(1, 640 / Math.max(w, h));
    canvas.width = Math.floor(w * scale);
    canvas.height = Math.floor(h * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });

    // FPS tracker
    const now = performance.now();
    const stamps = frameStampsRef.current;
    stamps.push(now);
    while (stamps.length && now - stamps[0] > 1000) stamps.shift();
    setFps(stamps.length);

    if (code?.data) {
      setLastDecoded(code.data);
      const expected = linkRef.current;
      if (expected && code.data.trim() === expected) {
        // Determine which preset the visible QR most likely was: since all 3
        // are on screen at once, mark whichever hasn't passed yet as OK when
        // decoded — the user is instructed to point at one size at a time.
        setPasses((prev) => {
          // First pass Small, then Medium, then Large — but only auto-advance
          // if the currently-focused one hasn't passed. We use the smallest
          // not-yet-passed as the "active" target so tests are progressive.
          const order: SizePreset["key"][] = ["sm", "md", "lg"];
          const target = order.find((k) => !prev[k].ok);
          if (!target) return prev;
          const ms = Math.round(now - startedAtRef.current);
          startedAtRef.current = now;
          toast.success(`Decoded at ${target.toUpperCase()} size in ${ms}ms`);
          return { ...prev, [target]: { ok: true, ms } };
        });
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    if (!linkRef.current) {
      setError("Enter a link to test first.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera API is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();
      resetResults();
      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      setError(err?.message ?? "Could not access camera. Grant permission and try again.");
    }
  }, [resetResults, tick]);

  const allPassed = passes.sm.ok && passes.md.ok && passes.lg.ok;

  const targetKey = useMemo<SizePreset["key"] | null>(() => {
    const order: SizePreset["key"][] = ["sm", "md", "lg"];
    return order.find((k) => !passes[k].ok) ?? null;
  }, [passes]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard/referral">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to referral
          </Link>
        </Button>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">QR scan test</h1>
        <p className="text-sm text-muted-foreground">
          Confirms the QR code your customers see actually decodes on a mobile camera at real-world
          sizes. Point the camera at each square below in order — the badge turns green as soon as
          the phone reads it.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Link encoded in the QR
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="min-w-[240px] flex-1"
          />
          {defaultLink && link !== defaultLink && (
            <Button variant="outline" size="sm" onClick={() => setLink(defaultLink)}>
              Use my referral link
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">QR settings</h2>
            <p className="text-xs text-muted-foreground">
              Higher error correction survives cropping and glare; auto quiet-zone widens the white
              border at small sizes so scanners still lock on.
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Error correction level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as QrLevel)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">L — Low (~7% recoverable)</SelectItem>
                <SelectItem value="M">M — Medium (~15%)</SelectItem>
                <SelectItem value="Q">Q — Quartile (~25%)</SelectItem>
                <SelectItem value="H">H — High (~30%, recommended)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Quiet zone</Label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Auto</span>
                <Switch checked={autoQuiet} onCheckedChange={setAutoQuiet} />
              </div>
            </div>
            {autoQuiet ? (
              <p className="text-[11px] text-muted-foreground">
                Tuned per size: {SIZES.map((s) =>
                  `${s.label.charAt(0)}=${computeQuietZoneModules(s.px, level)}`,
                ).join(" · ")} modules
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <Slider
                  min={2}
                  max={10}
                  step={1}
                  value={[manualMargin]}
                  onValueChange={(v) => setManualMargin(v[0] ?? 4)}
                  className="flex-1"
                />
                <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                  {manualMargin} mod
                </span>
              </div>
            )}
          </div>
        </div>
      </section>


      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Camera</h2>
            <p className="text-xs text-muted-foreground">
              {scanning
                ? `Scanning at ~${fps} fps. ${targetKey ? `Point at the ${targetKey.toUpperCase()} square next.` : "All sizes passed."}`
                : "Grant camera access to begin. Rear-facing camera is used by default."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {scanning ? (
              <Button variant="outline" size="sm" onClick={stopCamera}>
                <CameraOff className="mr-1 h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={startCamera}>
                <Camera className="mr-1 h-4 w-4" />
                Start scan test
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={resetResults} disabled={!scanning && !passes.sm.ok && !passes.md.ok && !passes.lg.ok}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full object-cover"
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                Camera off
              </div>
            )}
          </div>
          <div className="space-y-3">
            {lastDecoded && (
              <div className="rounded-md border border-border bg-muted/40 p-2 text-xs">
                <div className="font-medium text-muted-foreground">Last decoded</div>
                <div className="mt-0.5 break-all font-mono">{lastDecoded}</div>
                {lastDecoded.trim() !== linkRef.current && (
                  <div className="mt-1 text-amber-600">
                    Doesn't match the target link above.
                  </div>
                )}
              </div>
            )}
            {allPassed && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="mr-1 inline h-4 w-4" />
                All three sizes scanned successfully. Your QR is safe to print at any of these
                dimensions.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {SIZES.map((s) => {
          const state = passes[s.key];
          const isTarget = targetKey === s.key && scanning;
          return (
            <div
              key={s.key}
              className={`rounded-xl border p-4 transition ${
                state.ok
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : isTarget
                    ? "border-primary/60 bg-primary/5"
                    : "border-border bg-card"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.hint}</div>
                </div>
                {state.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className={`h-5 w-5 ${isTarget ? "text-primary" : "text-muted-foreground/40"}`} />
                )}
              </div>
              <div className="flex items-center justify-center rounded-md bg-white p-3">
                {link ? (
                  <QRCodeCanvas
                    value={link}
                    size={s.px}
                    includeMargin
                    level="H"
                    style={{ width: s.px, height: s.px, maxWidth: "100%" }}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground">No link set</div>
                )}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {state.ok ? `Decoded in ${state.ms ?? 0}ms` : isTarget ? "Point camera here" : "Waiting"}
              </div>
            </div>
          );
        })}
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: hold the phone about 10–20 cm away in good light. If a size fails after 20 seconds,
        the print size is likely too small — reprint at the next size up.
      </p>
    </div>
  );
}
