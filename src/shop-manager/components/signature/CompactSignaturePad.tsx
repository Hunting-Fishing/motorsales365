import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';

interface CompactSignaturePadProps {
  onChange?: (signature: string | null) => void;
  value?: string;
  required?: boolean;
  height?: number;
  width?: number;
}

export const CompactSignaturePad: React.FC<CompactSignaturePadProps> = ({
  onChange,
  value,
  required = false,
  height = 150,
  width = 400
}) => {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [savedSignature, setSavedSignature] = useState<string | null>(value || null);

  useEffect(() => {
    if (value && value !== savedSignature) {
      setSavedSignature(value);
    }
  }, [value]);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
    setSavedSignature(null);
    onChange?.(null);
  };

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const signatureData = sigPadRef.current.toDataURL('image/png');
      setSavedSignature(signatureData);
      onChange?.(signatureData);
    }
  };

  const handleBeginStroke = () => {
    setIsEmpty(false);
  };

  return (
    <div className="space-y-2">
      {savedSignature ? (
        <div className="space-y-2">
          <div className="border border-border rounded-md p-2 bg-card">
            <img 
              src={savedSignature} 
              alt="Signature" 
              className="max-w-full h-auto"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSavedSignature(null);
              handleClear();
            }}
            className="w-full"
          >
            Clear & Sign Again
          </Button>
        </div>
      ) : (
        <>
          <div className="border-2 border-dashed border-border rounded-md overflow-hidden bg-background">
            <SignatureCanvas
              ref={sigPadRef}
              canvasProps={{
                width,
                height,
                className: 'signature-canvas w-full touch-none',
                style: { touchAction: 'none' }
              }}
              backgroundColor="hsl(var(--background))"
              penColor="hsl(var(--foreground))"
              onBegin={handleBeginStroke}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={isEmpty}
              className="flex-1"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isEmpty}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </>
      )}
      {required && !savedSignature && (
        <p className="text-xs text-destructive">Signature is required</p>
      )}
    </div>
  );
};

export default CompactSignaturePad;
