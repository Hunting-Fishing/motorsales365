import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eraser, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void;
  label?: string;
  className?: string;
}

export function SignaturePad({ 
  onSignatureChange, 
  label = "Customer Signature",
  className 
}: SignaturePadProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const resizeCanvas = () => {
      if (sigCanvasRef.current && containerRef.current) {
        const canvas = sigCanvasRef.current.getCanvas();
        const container = containerRef.current;
        
        // Save current signature if any
        const currentData = sigCanvasRef.current.isEmpty() ? null : sigCanvasRef.current.toDataURL();
        
        // Resize canvas
        canvas.width = container.offsetWidth;
        canvas.height = 150;
        
        // Restore signature if there was one
        if (currentData) {
          sigCanvasRef.current.fromDataURL(currentData);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
    setIsEmpty(true);
    onSignatureChange(null);
  };

  const handleEnd = () => {
    if (sigCanvasRef.current) {
      const empty = sigCanvasRef.current.isEmpty();
      setIsEmpty(empty);
      if (!empty) {
        onSignatureChange(sigCanvasRef.current.toDataURL());
      }
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isEmpty}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg bg-background relative"
      >
        <SignatureCanvas
          ref={sigCanvasRef}
          penColor="black"
          canvasProps={{
            className: 'w-full rounded-lg',
            style: { touchAction: 'none' }
          }}
          onEnd={handleEnd}
        />
        
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-muted-foreground text-sm">
              Sign here
            </span>
          </div>
        )}
      </div>
      
      {!isEmpty && (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <Check className="h-4 w-4" />
          <span>Signature captured</span>
        </div>
      )}
    </div>
  );
}
