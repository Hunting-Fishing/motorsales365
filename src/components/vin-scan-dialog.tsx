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

export function vinFormatError(vin: string): string | null {
  if (!vin) return "Enter or scan a VIN";
  if (!VIN_REGEX.test(vin)) return "VIN must be 11–17 letters/numbers (no I, O, or Q)";
  if (vin.length === 17 && !vinChecksumValid(vin)) return "VIN check-digit failed — re-scan or re-type";
  return null;
}

// --- NHTSA decode --------------------------------------------------------

export type VinDecodeResult = {
  vin: string;
  year?: string;
  make?: string;
  model?: string;
  fuel?: string;
  transmission?: string;
};

async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NHTSA ${r.status}`);
  const json = (await r.json()) as { Results?: Array<Record<string, string>> };
  const row = json.Results?.[0] ?? {};
  const out: VinDecodeResult = { vin };
  if (row.ModelYear) out.year = row.ModelYear;
  if (row.Make) out.make = titleCase(row.Make);
  if (row.Model) out.model = titleCase(row.Model);
  if (row.FuelTypePrimary) out.fuel = mapFuel(row.FuelTypePrimary);
  if (row.TransmissionStyle) out.transmission = mapTransmission(row.TransmissionStyle);
  return out;
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function mapFuel(s: string): string | undefined {
  const x = s.toLowerCase();
  if (x.includes("diesel")) return "Diesel";
  if (x.includes("electric")) return "Electric";
  if (x.includes("hybrid")) return "Hybrid";
  if (x.includes("gas")) return "Gasoline";
  return undefined;
}

function mapTransmission(s: string): string | undefined {
  const x = s.toLowerCase();
  if (x.includes("cvt") || x.includes("continuously")) return "CVT";
  if (x.includes("manual")) return "Manual";
  if (x.includes("auto")) return "Automatic";
  return undefined;
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
