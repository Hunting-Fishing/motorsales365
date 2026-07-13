import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export function useBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScanning = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to scan barcodes.",
        variant: "destructive",
      });
    }
  }, []);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const generateBarcode = (text: string): string => {
    // Generate a simple barcode representation
    return text.padStart(12, '0').substring(0, 12);
  };

  const manualEntry = (code: string) => {
    setScannedCode(code);
    toast({
      title: "Barcode Entered",
      description: `Code: ${code}`,
    });
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isScanning,
    scannedCode,
    videoRef,
    startScanning,
    stopScanning,
    generateBarcode,
    manualEntry,
    setScannedCode
  };
}
