import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X, QrCode, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

interface QRCodeScannerProps {
  onScan?: (data: QRScanResult) => void;
}

export interface QRScanResult {
  type: 'equipment' | 'vehicle';
  id: string;
  inspection: string;
  app: string;
}

export function QRCodeScanner({ onScan }: QRCodeScannerProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScanning = async () => {
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
        
        // Start scanning loop
        requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const scanFrame = useCallback(() => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Use jsQR library for real QR code detection
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code) {
      try {
        // Parse QR code data (expected format: JSON with type, id, inspection, app)
        const result = JSON.parse(code.data) as QRScanResult;
        handleScanResult(result);
        return; // Stop scanning after successful read
      } catch (e) {
        // If not valid JSON, try URL format
        const url = new URL(code.data);
        const type = url.searchParams.get('type') as 'equipment' | 'vehicle';
        const id = url.searchParams.get('id');
        const inspection = url.searchParams.get('inspection');
        
        if (type && id && inspection) {
          handleScanResult({ type, id, inspection, app: 'shop-safety' });
          return;
        }
      }
    }
    
    requestAnimationFrame(scanFrame);
  }, [scanning]);

  // Simulate QR scan for demo purposes
  const simulateScan = () => {
    const mockResult: QRScanResult = {
      type: 'equipment',
      id: 'test-equipment-id',
      inspection: 'vessel',
      app: 'shop-safety'
    };
    
    handleScanResult(mockResult);
  };

  const handleScanResult = (result: QRScanResult) => {
    stopScanning();
    
    if (result.app !== 'shop-safety') {
      toast({
        title: 'Invalid QR Code',
        description: 'This QR code is not for this application',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'QR Code Scanned',
      description: `Starting ${result.inspection} inspection`
    });

    if (onScan) {
      onScan(result);
    } else {
      // Navigate to appropriate inspection form
      switch (result.inspection) {
        case 'vessel':
          navigate(`/safety/vessels/inspect/${result.id}`);
          break;
        case 'forklift':
          navigate(`/safety/equipment/forklift?equipmentId=${result.id}`);
          break;
        default:
          navigate('/safety');
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Scan QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {scanning ? (
          <div className="relative">
            <video 
              ref={videoRef} 
              className="w-full rounded-lg bg-black"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-primary rounded-lg animate-pulse" />
            </div>

            <Button 
              className="absolute top-2 right-2" 
              size="icon" 
              variant="secondary"
              onClick={stopScanning}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
              <Camera className="h-12 w-12 text-muted-foreground/50" />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Point your camera at an equipment QR code to start an inspection
            </p>

            <div className="flex gap-2 justify-center">
              <Button onClick={startScanning}>
                <Camera className="h-4 w-4 mr-2" />
                Start Scanner
              </Button>
              
              {/* Demo button - only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <Button variant="outline" onClick={simulateScan}>
                  Demo Scan
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
