import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, RotateCcw, Check, Download } from 'lucide-react';

interface SignaturePadProps {
  onSave?: (signature: string) => void;
  onClear?: () => void;
  title?: string;
  height?: number;
  width?: number;
  required?: boolean;
  initialValue?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onClear,
  title = "Please sign below",
  height = 200,
  width = 500,
  required = false,
  initialValue
}) => {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [savedSignature, setSavedSignature] = useState<string | null>(initialValue || null);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
    setSavedSignature(null);
    onClear?.();
  };

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const signatureData = sigPadRef.current.toDataURL('image/png');
      setSavedSignature(signatureData);
      onSave?.(signatureData);
    }
  };

  const handleDownload = () => {
    if (savedSignature) {
      const link = document.createElement('a');
      link.href = savedSignature;
      link.download = `signature-${Date.now()}.png`;
      link.click();
    }
  };

  const handleBeginStroke = () => {
    setIsEmpty(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>
            {title}
            {required && <span className="text-destructive ml-1">*</span>}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedSignature ? (
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4 bg-card">
              <img 
                src={savedSignature} 
                alt="Saved signature" 
                className="max-w-full h-auto mx-auto"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSavedSignature(null);
                  handleClear();
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Sign Again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-background">
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
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isEmpty}
              >
                <Eraser className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isEmpty}
              >
                <Check className="h-4 w-4 mr-2" />
                Save Signature
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SignaturePad;
