import React, { useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Printer, 
  Copy, 
  Smartphone, 
  Check,
  ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomerPortalQRCodeProps {
  shopId: string;
  businessName?: string;
  baseUrl?: string;
  compact?: boolean;
}

export function CustomerPortalQRCode({ 
  shopId,
  businessName = 'Your Fuel Delivery',
  baseUrl,
  compact = false
}: CustomerPortalQRCodeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Generate the portal URL with shop ID parameter
  const base = baseUrl || window.location.origin;
  const fullPortalUrl = `${base}/fuel-delivery-portal/register?shop=${shopId}`;

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'fuel-delivery-portal-qr.png';
      link.href = url;
      link.click();
      toast.success('QR Code downloaded');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullPortalUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const canvas = canvasRef.current?.querySelector('canvas');
      const imageUrl = canvas?.toDataURL('image/png');
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Customer Portal QR Code - ${businessName}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 2rem;
                text-align: center;
              }
              .container {
                max-width: 400px;
                padding: 2rem;
                border: 2px solid #e5e7eb;
                border-radius: 16px;
              }
              .logo { font-size: 2.5rem; margin-bottom: 1rem; }
              h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #111; }
              p { color: #666; margin-bottom: 1.5rem; }
              .qr-code { margin: 1.5rem 0; }
              .qr-code img { width: 200px; height: 200px; }
              .url { font-size: 0.875rem; color: #888; word-break: break-all; margin-top: 1rem; }
              .instructions {
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 1px solid #e5e7eb;
                text-align: left;
              }
              .instructions h2 { font-size: 1rem; margin-bottom: 0.75rem; }
              .instructions ol { padding-left: 1.25rem; font-size: 0.875rem; color: #555; }
              .instructions li { margin-bottom: 0.5rem; }
              @media print {
                body { padding: 0; }
                .container { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">⛽</div>
              <h1>${businessName}</h1>
              <p>Scan to order fuel delivery</p>
              <div class="qr-code">
                <img src="${imageUrl}" alt="QR Code" />
              </div>
              <div class="url">${fullPortalUrl}</div>
              <div class="instructions">
                <h2>How it works:</h2>
                <ol>
                  <li>Scan the QR code with your phone camera</li>
                  <li>Create an account or sign in</li>
                  <li>Add your delivery locations</li>
                  <li>Request fuel deliveries anytime</li>
                </ol>
              </div>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <QRCodeSVG 
          value={fullPortalUrl}
          size={80}
          level="M"
          includeMargin={false}
        />
        <div className="flex-1">
          <p className="font-medium text-sm">Customer Portal</p>
          <p className="text-xs text-muted-foreground mb-2">Scan to sign up</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {/* Hidden canvas for download/print */}
        <div ref={canvasRef} className="hidden">
          <QRCodeCanvas value={fullPortalUrl} size={400} level="H" includeMargin />
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Customer Self-Service Portal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center text-center">
          {/* QR Code Display */}
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            <QRCodeSVG 
              value={fullPortalUrl}
              size={160}
              level="M"
              includeMargin={false}
              fgColor="#000000"
              bgColor="#ffffff"
            />
          </div>
          
          {/* Hidden canvas for high-res download */}
          <div ref={canvasRef} className="hidden">
            <QRCodeCanvas 
              value={fullPortalUrl} 
              size={400} 
              level="H" 
              includeMargin 
            />
          </div>

          {/* Instructions */}
          <p className="text-sm text-muted-foreground mt-4 mb-1">
            Scan to sign up for fuel delivery
          </p>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Customers can register, manage locations, and request deliveries
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print Flyer
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy Link
                </>
              )}
            </Button>
          </div>

          {/* Direct Link */}
          <a 
            href={fullPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-primary hover:underline flex items-center gap-1"
          >
            Open Portal <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
