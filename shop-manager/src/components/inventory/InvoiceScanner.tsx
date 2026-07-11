import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Upload, Loader2, ArrowRight } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface ExtractedProduct {
  part_number: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string | null;
}

export function InvoiceScanner() {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview the image
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Convert to base64 for AI processing
    const base64Reader = new FileReader();
    base64Reader.onload = async (event) => {
      const base64Image = event.target?.result as string;
      await scanInvoice(base64Image);
    };
    base64Reader.readAsDataURL(file);
  };

  const scanInvoice = async (imageData: string) => {
    setIsScanning(true);
    setExtractedProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: { imageData }
      });

      if (error) {
        console.error('Error scanning invoice:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to scan invoice',
          variant: 'destructive'
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive'
        });
        return;
      }

      if (data?.products && Array.isArray(data.products)) {
        setExtractedProducts(data.products);
        toast({
          title: 'Success',
          description: `Extracted ${data.products.length} products from invoice`
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to scan invoice',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const openInForm = (product: ExtractedProduct) => {
    navigate('/inventory/add', {
      state: {
        extractedData: {
          name: product.description,
          sku: product.part_number || `AUTO-${Date.now()}`,
          category: product.category || 'General',
          quantity: product.quantity,
          unit_price: product.unit_price,
          cost_per_unit: product.unit_price,
          status: 'active'
        }
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Invoice Scanner</CardTitle>
        <CardDescription>
          Upload an invoice or receipt to automatically extract products and add them to inventory
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <label htmlFor="invoice-upload" className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>Upload Invoice</>
                )}
              </span>
            </Button>
          </label>
          <input
            id="invoice-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isScanning}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Supports JPG, PNG, WEBP
          </p>
        </div>

        {imagePreview && (
          <div className="rounded-lg overflow-hidden border border-border">
            <img 
              src={imagePreview} 
              alt="Invoice preview" 
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>
        )}

        {extractedProducts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Extracted Products ({extractedProducts.length})
              </h3>
            </div>

            <div className="space-y-2">
              {extractedProducts.map((product, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-muted/30 border border-border flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{product.description}</span>
                      {product.category && (
                        <Badge variant="outline">{product.category}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 text-sm text-muted-foreground">
                      {product.part_number && (
                        <div>Part #: {product.part_number}</div>
                      )}
                      <div>Qty: {product.quantity}</div>
                      <div>Unit Price: ${product.unit_price.toFixed(2)}</div>
                      <div>Total: ${product.total_price.toFixed(2)}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openInForm(product)}
                  >
                    Open in Form
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
