import { useState, useCallback } from 'react';

export function useCamera() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capturePhoto = useCallback(async (): Promise<File | null> => {
    setIsCapturing(true);
    setError(null);

    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not available on this device');
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera by default
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      // Create video element for preview
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      return new Promise<File | null>((resolve) => {
        video.onloadedmetadata = () => {
          // Create canvas for capturing the frame
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) {
            resolve(null);
            return;
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw video frame to canvas
          context.drawImage(video, 0, 0);

          // Convert canvas to blob
          canvas.toBlob((blob) => {
            // Stop the video stream
            stream.getTracks().forEach(track => track.stop());

            if (blob) {
              const file = new File([blob], `photo_${Date.now()}.jpg`, {
                type: 'image/jpeg'
              });
              resolve(file);
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.9);
        };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture photo';
      setError(errorMessage);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const captureFromInput = useCallback((): Promise<File | null> => {
    return new Promise((resolve) => {
      // Create file input for camera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Request camera

      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        resolve(file || null);
      };

      input.oncancel = () => {
        resolve(null);
      };

      // Trigger the file picker
      input.click();
    });
  }, []);

  return {
    isCapturing,
    error,
    capturePhoto,
    captureFromInput
  };
}