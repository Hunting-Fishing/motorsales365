import React, { useState } from 'react';
import { 
  Camera, 
  Mic, 
  MapPin, 
  QrCode, 
  Download,
  Share,
  FileImage,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';
import { useCamera } from '@/hooks/useCamera';
import { useGeolocation } from '@/hooks/useGeolocation';
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner';
import { cn } from '@/lib/utils';

interface DeviceIntegrationProps {
  workOrderId?: string;
  onPhotoCapture?: (photo: File) => void;
  onLocationCapture?: (location: GeolocationPosition) => void;
  onBarcodeScanned?: (barcode: string) => void;
  className?: string;
}

export function DeviceIntegration({
  workOrderId,
  onPhotoCapture,
  onLocationCapture,
  onBarcodeScanned,
  className
}: DeviceIntegrationProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  
  const { 
    hasCamera, 
    hasGeolocation, 
    hasShare, 
    canInstall,
    isStandalone 
  } = useDeviceCapabilities();
  
  const { capturePhoto, error: cameraError } = useCamera();
  const { getCurrentLocation, error: locationError } = useGeolocation();

  const handlePhotoCapture = async () => {
    if (!hasCamera) return;
    
    setIsCapturing(true);
    try {
      const photo = await capturePhoto();
      if (photo) {
        setCapturedPhotos(prev => [...prev, photo]);
        onPhotoCapture?.(photo);
      }
    } catch (error) {
      console.error('Photo capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleLocationCapture = async () => {
    if (!hasGeolocation) return;
    
    try {
      const position = await getCurrentLocation();
      onLocationCapture?.(position);
    } catch (error) {
      console.error('Location capture failed:', error);
    }
  };

  const handleBarcodeScanner = () => {
    setScannerOpen(true);
  };

  const handleBarcodeScan = (code: string) => {
    onBarcodeScanned?.(code);
    setScannerOpen(false);
  };

  const handleShare = async () => {
    if (!hasShare) return;
    
    try {
      await navigator.share({
        title: 'Work Order Progress',
        text: `Work Order ${workOrderId} progress update`,
        url: window.location.href
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const capabilities = [
    {
      id: 'camera',
      label: 'Camera',
      icon: Camera,
      available: hasCamera,
      action: handlePhotoCapture,
      loading: isCapturing,
      description: 'Capture photos for work orders'
    },
    {
      id: 'location',
      label: 'Location',
      icon: MapPin,
      available: hasGeolocation,
      action: handleLocationCapture,
      description: 'Get current GPS location'
    },
    {
      id: 'scanner',
      label: 'Scanner',
      icon: QrCode,
      available: hasCamera,
      action: handleBarcodeScanner,
      description: 'Scan QR codes and barcodes'
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share,
      available: hasShare,
      action: handleShare,
      description: 'Share work order updates'
    }
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Device Features</span>
            {isStandalone && (
              <Badge variant="secondary">PWA Mode</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {capabilities.map((capability) => (
              <Button
                key={capability.id}
                variant={capability.available ? "outline" : "secondary"}
                className={cn(
                  "h-auto p-4 flex flex-col items-center space-y-2",
                  !capability.available && "opacity-50 cursor-not-allowed"
                )}
                onClick={capability.action}
                disabled={!capability.available || capability.loading}
              >
                <capability.icon className={cn(
                  "h-6 w-6",
                  capability.loading && "animate-pulse"
                )} />
                <div className="text-center">
                  <div className="font-medium text-sm">
                    {capability.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {capability.available ? 'Available' : 'Not Available'}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {(cameraError || locationError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {cameraError && `Camera: ${cameraError}`}
            {locationError && `Location: ${locationError}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Captured Photos */}
      {capturedPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileImage className="h-5 w-5" />
              <span>Captured Photos</span>
              <Badge variant="secondary">{capturedPhotos.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {capturedPhotos.map((photo, index) => (
                <div
                  key={index}
                  className="aspect-square bg-muted rounded-md border overflow-hidden"
                >
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Captured ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}