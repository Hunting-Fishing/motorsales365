import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ClipboardPaste, Loader2, ScanLine, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- VIN validation -----------------------------------------------------

// VIN excludes I, O, Q. 11–17 chars to also accept legacy / motorcycle VINs.
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{11,17}$/;

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** ISO 3779 check-digit validation. Only meaningful for 17-char VINs (post-1981 cars). */
export function vinChecksumValid(vin: string): boolean {
  if (vin.length !== 17) return true; // skip for shorter (older / moto) VINs
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const v = TRANSLIT[c];
    if (v === undefined) return false;
    sum += v * WEIGHTS[i];
  }
  const expected = sum % 11;
  const check = vin[8];
  const checkVal = check === "X" ? 10 : Number(check);
  return Number.isInteger(checkVal) && checkVal === expected;
}

export function normalizeVin(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export type VinFormatCheck =
  | { kind: "empty" }
  | { kind: "ok_vin" }
  | { kind: "ok_chassis" }
  | { kind: "warn_checksum" }
  | { kind: "bad_chars"; message: string }
  | { kind: "bad_length"; message: string };

/** Structured VIN/chassis format check. Accepts Asia/Europe chassis numbers. */
export function checkVinFormat(vin: string): VinFormatCheck {
  if (!vin) return { kind: "empty" };
  if (/[IOQ]/.test(vin)) {
    return { kind: "bad_chars", message: "Remove I, O, or Q — VIN doesn't use those letters." };
  }
  if (!/^[A-Z0-9]+$/.test(vin)) {
    return { kind: "bad_chars", message: "VIN uses only letters and numbers." };
  }
  if (vin.length < 11 || vin.length > 17) {
    return { kind: "bad_length", message: "VIN or chassis # must be 11–17 characters." };
  }
  if (vin.length === 17) {
    return vinChecksumValid(vin) ? { kind: "ok_vin" } : { kind: "warn_checksum" };
  }
  return { kind: "ok_chassis" };
}

/** Legacy string helper — barcode scanner path requires a full VIN. */
export function vinFormatError(vin: string): string | null {
  const c = checkVinFormat(vin);
  switch (c.kind) {
    case "empty": return "Enter or scan a VIN";
    case "bad_chars":
    case "bad_length": return c.message;
    case "warn_checksum": return "VIN check-digit failed — re-scan or re-type";
    case "ok_chassis": return "Scanner needs a full 17-character VIN";
    case "ok_vin": return null;
  }
}

// Suppress unused-var lint on VIN_REGEX (kept for reference).
void VIN_REGEX;

// --- VIN decode (server-side waterfall) ----------------------------------

import { decodeVin as decodeVinServer } from "@/lib/vin-decode.functions";
import type { DecodedFields, FieldSource } from "@/lib/vin-decode.server";
import type { Region } from "@/data/vin-vds-tables";

export type VinDecodeResult = {
  vin: string;
  year?: string;
  make?: string;
  model?: string;
  fuel?: string;
  transmission?: string;
  engine?: string;
  trim?: string;
  /** Canonical BODY_TYPES value (sedan, suv, hatchback, …). */
  bodyType?: string;
  /** Canonical DRIVETRAINS value (fwd, rwd, awd, 4x4, 4x2). */
  drivetrain?: string;
  category?: "car" | "motorcycle";
  region?: Region;
  primarySource?: "nhtsa" | "vds" | "ai" | "jdm_table" | "wmi";
  sources?: Partial<Record<keyof DecodedFields, FieldSource>>;
  missing?: string[];
  notes?: string[];
};

export class VinDecodeError extends Error {
  kind: "network" | "http";
  status?: number;
  constructor(kind: "network" | "http", message: string, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

/** Client wrapper around the server-side multi-region waterfall (NHTSA →
 *  structural WMI/VDS → AI). Throws `VinDecodeError` so the caller's
 *  existing error paths keep working. */
export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  let r;
  try {
    r = await decodeVinServer({ data: { value: vin } });
  } catch (e) {
    throw new VinDecodeError("network", e instanceof Error ? e.message : "network error");
  }
  if (!r.ok) {
    // Preserve the VIN so the field stays populated; surface reason via HTTP-kind error.
    throw new VinDecodeError("http", r.reason);
  }
  return {
    vin: r.vin,
    year: r.year,
    make: r.make,
    model: r.model,
    fuel: r.fuel,
    transmission: r.transmission,
    engine: r.engine,
    trim: r.trim,
    bodyType: r.bodyType,
    drivetrain: r.drivetrain,
    category: r.category,
    region: r.region,
    primarySource: r.primarySource,
    sources: r.sources,
    missing: r.missing,
    notes: r.notes,
  };
}


// --- BarcodeDetector availability ---------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BarcodeDetectorCtor: any =
  typeof window !== "undefined" ? (window as any).BarcodeDetector : undefined;

// --- Component -----------------------------------------------------------

type Props = {
  trigger?: React.ReactNode;
  onResult: (r: VinDecodeResult) => void;
};

export function VinScanDialog({ trigger, onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"paste" | "camera">("paste");
  const [vin, setVin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);

  const cameraSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!BarcodeDetectorCtor;

  useEffect(() => {
    if (!open) {
      stopCamera();
      setVin("");
      setError(null);
      setDecoding(false);
      setMode("paste");
    }
  }, [open]);

  const stopCamera = () => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    if (!cameraSupported) {
      toast.error("Camera VIN scanning isn't supported in this browser — paste the VIN instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);

      const detector = new BarcodeDetectorCtor({
        formats: ["code_39", "code_128", "qr_code", "data_matrix"],
      });
      let cancelled = false;
      const tick = async () => {
        if (cancelled || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          for (const c of codes) {
            const raw = normalizeVin(String(c.rawValue ?? ""));
            // Look for a VIN-shaped substring (11–17 chars) inside the scan
            const m = raw.match(/[A-HJ-NPR-Z0-9]{11,17}/);
            if (m) {
              const candidate = m[0];
              if (!vinFormatError(candidate)) {
                cancelled = true;
                setVin(candidate);
                stopCamera();
                await runDecode(candidate);
                return;
              }
            }
          }
        } catch {
          // ignore frame errors
        }
        if (!cancelled) requestAnimationFrame(tick);
      };
      stopScanRef.current = () => {
        cancelled = true;
      };
      requestAnimationFrame(tick);
    } catch (e) {
      toast.error("Couldn't access the camera. Check permissions and try again.");
      stopCamera();
    }
  };

  const runDecode = async (candidate: string) => {
    const fmt = vinFormatError(candidate);
    if (fmt) {
      setError(fmt);
      return;
    }
    setError(null);
    setDecoding(true);
    try {
      const r = await decodeVin(candidate);
      onResult(r);
      toast.success(
        r.year || r.make
          ? `VIN decoded: ${[r.year, r.make, r.model].filter(Boolean).join(" ")}`
          : "VIN saved — couldn't decode make/model, please fill in manually.",
      );
      setOpen(false);
    } catch {
      // Even if decode fails, hand back the VIN so the field is populated.
      onResult({ vin: candidate });
      toast.warning("VIN saved, but online decoding failed. Fill remaining fields manually.");
      setOpen(false);
    } finally {
      setDecoding(false);
    }
  };

  const handleConfirm = () => runDecode(normalizeVin(vin));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            <ScanLine className="mr-1.5 h-4 w-4" /> Scan or paste VIN
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan or paste VIN</DialogTitle>
          <DialogDescription>
            We'll validate the format and try to auto-fill year, make, and model.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "paste" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              stopCamera();
              setMode("paste");
            }}
          >
            <ClipboardPaste className="mr-1.5 h-4 w-4" /> Paste / type
          </Button>
          <Button
            type="button"
            variant={mode === "camera" ? "default" : "outline"}
            size="sm"
            disabled={!cameraSupported}
            onClick={() => {
              setMode("camera");
              if (!cameraOn) startCamera();
            }}
          >
            <Camera className="mr-1.5 h-4 w-4" /> Camera
          </Button>
        </div>

        {!cameraSupported && mode === "camera" && (
          <p className="text-xs text-muted-foreground">
            Camera scanning needs a recent Chrome/Edge on Android or desktop with the
            BarcodeDetector API. Paste the VIN instead.
          </p>
        )}

        {mode === "camera" && cameraSupported && (
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            <video
              ref={videoRef}
              className="aspect-video w-full object-cover"
              playsInline
              muted
            />
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-16 -translate-y-1/2 rounded-md border-2 border-primary/80" />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80">
                Starting camera…
              </div>
            )}
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
              onClick={stopCamera}
              aria-label="Stop camera"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div>
          <Label>VIN</Label>
          <Input
            value={vin}
            maxLength={17}
            placeholder="e.g. 1HGCM82633A004352"
            autoCapitalize="characters"
            onChange={(e) => {
              setVin(normalizeVin(e.target.value));
              setError(null);
            }}
          />
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">
            VIN is on the dashboard near the windshield, driver-side door jamb, or
            engine block. Motorcycles: under the seat or on the steering neck.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={decoding || !vin}>
            {decoding ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Decoding…
              </>
            ) : (
              "Use this VIN"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
