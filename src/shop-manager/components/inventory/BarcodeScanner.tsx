import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBarcodeScanner } from '@/hooks/inventory/useBarcodeScanner';
import { Camera, X, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const { isScanning, scannedCode, videoRef, startScanning, stopScanning, manualEntry } = useBarcodeScanner();
  const [manualCode, setManualCode] = useState('');
  const [useManual, setUseManual] = useState(false);

  const handleScan = () => {
    if (scannedCode) {
      onScan(scannedCode);
      onClose();
    }
  };

  const handleManualSubmit = () => {
    if (manualCode) {
      manualEntry(manualCode);
      onScan(manualCode);
      setManualCode('');
      onClose();
    }
  };

  const handleClose = () => {
    stopScanning();
    setUseManual(false);
    setManualCode('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!useManual ? (
            <>
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                {isScanning ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                {scannedCode && (
                  <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground p-2 text-center">
                    Scanned: {scannedCode}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!isScanning ? (
                  <Button onClick={startScanning} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="outline" className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Stop Camera
                  </Button>
                )}
                
                <Button onClick={() => setUseManual(true)} variant="outline">
                  <Keyboard className="h-4 w-4 mr-2" />
                  Manual Entry
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="manual-code">Enter Barcode Manually</Label>
                <Input
                  id="manual-code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter barcode number"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSubmit();
                    }
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleManualSubmit} className="flex-1">
                  Submit
                </Button>
                <Button onClick={() => setUseManual(false)} variant="outline">
                  Back to Camera
                </Button>
              </div>
            </>
          )}

          {scannedCode && (
            <Button onClick={handleScan} className="w-full">
              Use Scanned Code
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
