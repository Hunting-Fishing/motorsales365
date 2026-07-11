import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface QRCodeGeneratorProps {
  assetType: 'equipment' | 'vehicle';
  assetId: string;
  assetName: string;
  inspectionType?: string;
}

export function QRCodeGenerator({ 
  assetType, 
  assetId, 
  assetName,
  inspectionType = 'vessel'
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrData = JSON.stringify({
    type: assetType,
    id: assetId,
    inspection: inspectionType,
    app: 'shop-safety'
  });

  // Generate QR code using canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple QR code generation using a basic pattern
    // In production, you'd use a library like qrcode
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    // Draw a placeholder QR pattern (replace with actual QR library)
    ctx.fillStyle = 'black';
    
    // Generate a simple pattern based on the data hash
    const hash = simpleHash(qrData);
    const moduleSize = 10;
    const modules = 20;
    
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        const bit = (hash >> ((x + y * modules) % 32)) & 1;
        if (bit || isPositionModule(x, y, modules)) {
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    // Draw position patterns (corners)
    drawPositionPattern(ctx, 0, 0, moduleSize);
    drawPositionPattern(ctx, (modules - 7) * moduleSize, 0, moduleSize);
    drawPositionPattern(ctx, 0, (modules - 7) * moduleSize, moduleSize);

  }, [qrData]);

  const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  };

  const isPositionModule = (x: number, y: number, modules: number): boolean => {
    // Check if in position pattern area
    if (x < 7 && y < 7) return false; // Top-left
    if (x >= modules - 7 && y < 7) return false; // Top-right
    if (x < 7 && y >= modules - 7) return false; // Bottom-left
    return false;
  };

  const drawPositionPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, moduleSize: number) => {
    // Outer black square
    ctx.fillStyle = 'black';
    ctx.fillRect(x, y, 7 * moduleSize, 7 * moduleSize);
    
    // Middle white square
    ctx.fillStyle = 'white';
    ctx.fillRect(x + moduleSize, y + moduleSize, 5 * moduleSize, 5 * moduleSize);
    
    // Inner black square
    ctx.fillStyle = 'black';
    ctx.fillRect(x + 2 * moduleSize, y + 2 * moduleSize, 3 * moduleSize, 3 * moduleSize);
  };

  const downloadQR = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `qr-${assetName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    
    toast({ title: 'QR Code downloaded' });
  };

  const printQR = () => {
    if (!canvasRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head><title>QR Code - ${assetName}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;">
          <h2 style="margin-bottom:20px;">${assetName}</h2>
          <img src="${canvasRef.current.toDataURL('image/png')}" style="width:200px;height:200px;" />
          <p style="margin-top:20px;color:#666;">Scan to start ${inspectionType} inspection</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const saveQRToDatabase = async () => {
    const table = assetType === 'equipment' ? 'equipment_assets' : 'vehicles';
    
    try {
      const { error } = await supabase
        .from(table)
        .update({ 
          qr_code: qrData,
          qr_code_generated_at: new Date().toISOString()
        })
        .eq('id', assetId);

      if (error) throw error;
      
      toast({ title: 'QR code saved to asset' });
    } catch (error: any) {
      console.error('Error saving QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to save QR code',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <canvas 
            ref={canvasRef} 
            className="border rounded-lg"
            style={{ width: 200, height: 200 }}
          />
        </div>
        
        <p className="text-sm text-center text-muted-foreground">
          Scan to start {inspectionType} inspection for {assetName}
        </p>

        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={downloadQR}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button size="sm" variant="outline" onClick={printQR}>
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button size="sm" onClick={saveQRToDatabase}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
