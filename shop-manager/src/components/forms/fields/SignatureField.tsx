import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eraser, Check, RotateCcw } from 'lucide-react';

interface SignatureFieldProps {
  id?: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  helpText?: string;
  disabled?: boolean;
  width?: number;
  height?: number;
}

export const SignatureField: React.FC<SignatureFieldProps> = ({
  id,
  label = 'Signature',
  value,
  onChange,
  required = false,
  helpText,
  disabled = false,
  width = 400,
  height = 150,
}) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(!value);

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
      onChange('');
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      setIsEmpty(sigCanvas.current.isEmpty());
      onChange(dataUrl);
    }
  };

  const handleConfirm = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  // Load existing signature if value is provided
  React.useEffect(() => {
    if (value && sigCanvas.current) {
      sigCanvas.current.fromDataURL(value);
      setIsEmpty(false);
    }
  }, [value]);

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <Card className={disabled ? 'opacity-50 pointer-events-none' : ''}>
        <CardContent className="p-3">
          <div 
            className="border rounded-md bg-white"
            style={{ width: '100%', maxWidth: width }}
          >
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                width: width,
                height: height,
                className: 'signature-canvas',
                style: { 
                  width: '100%', 
                  height: height,
                  touchAction: 'none'
                }
              }}
              onEnd={handleEnd}
              backgroundColor="white"
              penColor="black"
            />
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isEmpty || disabled}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => sigCanvas.current?.fromDataURL(value || '')}
                disabled={!value || disabled}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
            
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirm}
              disabled={isEmpty || disabled}
            >
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
      
      {value && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <Check className="h-3 w-3" />
          Signature captured
        </p>
      )}
    </div>
  );
};

export default SignatureField;
