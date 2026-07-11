import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Plus, ScanBarcode, Zap, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { BarcodeScannerDialog } from './BarcodeScannerDialog';
import { NutritionFactsPanel } from './NutritionFactsPanel';

interface SearchResult {
  nix_item_id: string;
  food_name: string;
  brand_name: string;
  serving_qty: number;
  serving_unit: string;
  nf_calories: number;
  photo: string | null;
}

interface NormalizedProduct {
  name: string;
  brand_name: string | null;
  serving_size: string;
  calories: number;
  image_url: string | null;
  barcode: string | null;
  nix_item_id: string | null;
  nutrition_facts: Record<string, { amount: string; dv: number | null }>;
}

export function NutritionixSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<NormalizedProduct | null>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [detailProduct, setDetailProduct] = useState<NormalizedProduct | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { shopId } = useShopId();

  const searchProducts = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSetupRequired(false);
    try {
      const { data, error } = await supabase.functions.invoke('nutritionix-lookup', {
        body: { action: 'search', query: query.trim() },
      });
      if (error) throw error;
      if (data.setup_required) {
        setSetupRequired(true);
        return;
      }
      setResults(data.results || []);
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const lookupBarcode = async (upc: string) => {
    setBarcodeLoading(true);
    setBarcodeProduct(null);
    try {
      const { data, error } = await supabase.functions.invoke('nutritionix-lookup', {
        body: { action: 'barcode', upc },
      });
      if (error) throw error;
      if (data.setup_required) {
        setSetupRequired(true);
        return;
      }
      if (data.product) {
        setBarcodeProduct(data.product);
      } else {
        toast({ title: 'Not found', description: `No product found for barcode ${upc}`, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Barcode lookup failed', variant: 'destructive' });
    } finally {
      setBarcodeLoading(false);
    }
  };

  const getItemDetail = async (nixItemId: string) => {
    setDetailLoading(nixItemId);
    try {
      const { data, error } = await supabase.functions.invoke('nutritionix-lookup', {
        body: { action: 'item', nix_item_id: nixItemId },
      });
      if (error) throw error;
      if (data.product) {
        setDetailProduct(data.product);
      }
    } catch {
      toast({ title: 'Failed to load details', variant: 'destructive' });
    } finally {
      setDetailLoading(null);
    }
  };

  const importProduct = async (product: NormalizedProduct) => {
    if (!shopId) return;
    setImporting(product.nix_item_id || product.barcode || 'import');
    try {
      const { error } = await supabase.from('pt_supplements').insert({
        shop_id: shopId,
        name: product.name,
        category: 'other',
        description: product.brand_name ? `${product.brand_name} - ${product.serving_size}` : product.serving_size,
        image_url: product.image_url || '',
        barcode: product.barcode || '',
        serving_size: product.serving_size,
        nutrition_facts: product.nutrition_facts,
        product_type: 'supplement',
      } as any);
      if (error) throw error;
      toast({ title: 'Imported!', description: `${product.name} added to your catalog with full nutrition data` });
      setBarcodeProduct(null);
      setDetailProduct(null);
    } catch {
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Nutritionix Search Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Nutritionix Verified Database</h3>
            <Badge variant="secondary" className="text-[10px]">Premium</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Search verified branded supplements with full nutrition facts, or scan a barcode.
          </p>

          {setupRequired && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-400">
                <strong>API keys not configured yet.</strong> Once you receive your Nutritionix credentials, they'll be added to activate this feature.
                Sign up at{' '}
                <a href="https://developer.nutritionix.com/" target="_blank" rel="noopener" className="underline">
                  developer.nutritionix.com
                </a>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Search supplements (e.g. doTERRA Microplex VMz, Nature Made Vitamin D)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchProducts()}
            />
            <Button onClick={searchProducts} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={() => setScannerOpen(true)}>
              <ScanBarcode className="h-4 w-4" />
            </Button>
          </div>

          {/* Barcode result */}
          {barcodeLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Looking up barcode...</span>
            </div>
          )}

          {barcodeProduct && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                {barcodeProduct.image_url && (
                  <img src={barcodeProduct.image_url} alt={barcodeProduct.name}
                    className="w-20 h-20 object-cover rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-semibold text-foreground">{barcodeProduct.name}</h4>
                  {barcodeProduct.brand_name && (
                    <p className="text-sm text-muted-foreground">{barcodeProduct.brand_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Serving: {barcodeProduct.serving_size}</p>
                  {barcodeProduct.barcode && <Badge variant="outline" className="text-[10px] font-mono">{barcodeProduct.barcode}</Badge>}
                </div>
                <Button size="sm" onClick={() => importProduct(barcodeProduct)}
                  disabled={importing === (barcodeProduct.nix_item_id || barcodeProduct.barcode || 'import')}>
                  {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                  Import
                </Button>
              </div>
              {Object.keys(barcodeProduct.nutrition_facts).length > 0 && (
                <NutritionFactsPanel nutritionFacts={barcodeProduct.nutrition_facts} servingSize={barcodeProduct.serving_size} />
              )}
            </div>
          )}

          {/* Detail view */}
          {detailProduct && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                {detailProduct.image_url && (
                  <img src={detailProduct.image_url} alt={detailProduct.name}
                    className="w-20 h-20 object-cover rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-semibold text-foreground">{detailProduct.name}</h4>
                  {detailProduct.brand_name && (
                    <p className="text-sm text-muted-foreground">{detailProduct.brand_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Serving: {detailProduct.serving_size}</p>
                </div>
                <Button size="sm" onClick={() => importProduct(detailProduct)}
                  disabled={!!importing}>
                  {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                  Import
                </Button>
              </div>
              {Object.keys(detailProduct.nutrition_facts).length > 0 && (
                <NutritionFactsPanel nutritionFacts={detailProduct.nutrition_facts} servingSize={detailProduct.serving_size} />
              )}
              <Button variant="ghost" size="sm" onClick={() => setDetailProduct(null)}>← Back to results</Button>
            </div>
          )}

          {/* Search results */}
          {!detailProduct && results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {results.map(item => (
                <Card key={item.nix_item_id} className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => getItemDetail(item.nix_item_id)}>
                  <CardContent className="p-3 flex gap-3">
                    {item.photo && (
                      <img src={item.photo} alt={item.food_name}
                        className="w-14 h-14 object-cover rounded-lg shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-sm font-medium text-foreground truncate">{item.food_name}</h4>
                      <p className="text-xs text-muted-foreground">{item.brand_name}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground">
                        <span>{item.serving_qty} {item.serving_unit}</span>
                        {item.nf_calories != null && <span>• {Math.round(item.nf_calories)} cal</span>}
                      </div>
                    </div>
                    {detailLoading === item.nix_item_id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0 self-center" />
                    ) : (
                      <Badge variant="outline" className="text-[9px] shrink-0 self-center">View →</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && !detailProduct && results.length === 0 && query && !setupRequired && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No results found. Try different search terms.
            </p>
          )}
        </CardContent>
      </Card>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onBarcodeDetected={lookupBarcode}
      />
    </div>
  );
}
