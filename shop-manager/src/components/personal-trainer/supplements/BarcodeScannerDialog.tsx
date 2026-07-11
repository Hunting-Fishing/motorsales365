import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, X, Keyboard, Loader2 } from 'lucide-react';

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeDetected: (upc: string) => void;
}

export function BarcodeScannerDialog({ open, onOpenChange, onBarcodeDetected }: BarcodeScannerDialogProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualUpc, setManualUpc] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanning(true);

    // Check BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setCameraError('Barcode scanning not supported in this browser. Use manual entry or try Chrome/Edge.');
      setMode('manual');
      setScanning(false);
      return;
    }

    try {
      detectorRef.current = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        detectBarcode();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Could not access camera. Please allow camera permissions or use manual entry.');
      setMode('manual');
      setScanning(false);
    }
  }, []);

  const detectBarcode = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current || !streamRef.current) return;

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const upc = barcodes[0].rawValue;
        stopCamera();
        setScanning(false);
        onBarcodeDetected(upc);
        onOpenChange(false);
        return;
      }
    } catch (err) {
      // Detection frame failed, continue scanning
    }

    animationRef.current = requestAnimationFrame(() => {
      setTimeout(detectBarcode, 200); // Scan every 200ms
    });
  }, [onBarcodeDetected, onOpenChange, stopCamera]);

  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera();
    }
    return () => {
      stopCamera();
      setScanning(false);
    };
  }, [open, mode, startCamera, stopCamera]);

  const handleManualSubmit = () => {
    const trimmed = manualUpc.trim();
    if (trimmed) {
      onBarcodeDetected(trimmed);
      onOpenChange(false);
      setManualUpc('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopCamera(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Product Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'camera' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('camera')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-1" /> Camera
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setMode('manual'); stopCamera(); }}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-1" /> Manual
            </Button>
          </div>

          {mode === 'camera' && (
            <div className="space-y-2">
              {cameraError ? (
                <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm text-center">
                  {cameraError}
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-primary/70 rounded-lg w-3/4 h-1/2 animate-pulse" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="bg-background/80 text-foreground text-xs px-3 py-1 rounded-full">
                      {scanning ? 'Point camera at barcode...' : 'Starting camera...'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the UPC/barcode number from the product label:
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 810022650640"
                  value={manualUpc}
                  onChange={e => setManualUpc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                  className="font-mono"
                />
                <Button onClick={handleManualSubmit} disabled={!manualUpc.trim()}>
                  Lookup
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
