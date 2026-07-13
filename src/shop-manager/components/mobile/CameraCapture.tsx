import React, { useRef, useState, useCallback } from 'react';
import { Camera, Square, RotateCcw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
  maxSize?: number; // in MB
}

export function CameraCapture({ 
  onCapture, 
  onCancel, 
  aspectRatio = 'landscape', 
  maxSize = 5 
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const flipCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, [stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions based on aspect ratio
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    let canvasWidth, canvasHeight;
    
    switch (aspectRatio) {
      case 'square':
        const minDimension = Math.min(videoWidth, videoHeight);
        canvasWidth = canvasHeight = minDimension;
        break;
      case 'portrait':
        canvasWidth = Math.min(videoWidth, videoHeight);
        canvasHeight = Math.max(videoWidth, videoHeight);
        break;
      default: // landscape
        canvasWidth = Math.max(videoWidth, videoHeight);
        canvasHeight = Math.min(videoWidth, videoHeight);
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Calculate crop position to center the image
    const cropX = (videoWidth - canvasWidth) / 2;
    const cropY = (videoHeight - canvasHeight) / 2;

    // Draw the cropped image
    context.drawImage(
      video,
      cropX, cropY, canvasWidth, canvasHeight,
      0, 0, canvasWidth, canvasHeight
    );

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    setIsCapturing(true);
  }, [aspectRatio]);

  const confirmCapture = useCallback(async () => {
    if (!capturedImage) return;

    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Check file size
      const fileSizeMB = blob.size / (1024 * 1024);
      if (fileSizeMB > maxSize) {
        setError(`Image too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${maxSize}MB.`);
        return;
      }

      // Create file
      const file = new File([blob], `captured-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      stopCamera();
      onCapture(file);
    } catch (err) {
      console.error('Error processing captured image:', err);
      setError('Error processing image. Please try again.');
    }
  }, [capturedImage, maxSize, stopCamera, onCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setIsCapturing(false);
    setError(null);
  }, []);

  const handleCancel = useCallback(() => {
    stopCamera();
    onCancel();
  }, [stopCamera, onCancel]);

  // Start camera when component mounts
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Restart camera when facing mode changes
  React.useEffect(() => {
    if (stream) {
      startCamera();
    }
  }, [facingMode, startCamera, stream]);

  const getOverlayStyle = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'portrait':
        return 'aspect-[3/4]';
      default:
        return 'aspect-video';
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {!isCapturing ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-4/5 max-w-md border-2 border-white rounded-lg ${getOverlayStyle()}`}>
                <div className="w-full h-full border border-white/50 rounded-lg"></div>
              </div>
            </div>

            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={handleCancel} className="text-white">
                <X className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={flipCamera} className="text-white">
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <Button
                size="lg"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 text-black"
              >
                <Camera className="h-6 w-6" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Preview */}
            <img
              src={capturedImage || ''}
              alt="Captured"
              className="w-full h-full object-cover"
            />
            
            {/* Preview Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
              <Button
                size="lg"
                onClick={retakePhoto}
                variant="outline"
                className="w-12 h-12 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                onClick={confirmCapture}
                className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="m-4 p-4 bg-red-50 border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
        </Card>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}