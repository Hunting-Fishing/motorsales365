import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Barcode, Star, Plus } from 'lucide-react';
import { useFoodSearch, useBarcodeLookup, useScoreFood } from '@/hooks/useNutrition';

interface Props {
  clientId?: string;
  shopId?: string;
  onSelectProduct?: (product: any) => void;
  onLogFood?: (product: any) => void;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 bg-green-100';
  if (score >= 40) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

function getNutriScoreColor(grade: string): string {
  const colors: Record<string, string> = { a: 'bg-green-500', b: 'bg-lime-500', c: 'bg-yellow-500', d: 'bg-orange-500', e: 'bg-red-500' };
  return colors[grade?.toLowerCase()] || 'bg-muted';
}

export default function FoodSearch({ clientId, shopId, onSelectProduct, onLogFood }: Props) {
  const [query, setQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [mode, setMode] = useState<'search' | 'barcode'>('search');
  const searchMutation = useFoodSearch();
  const barcodeMutation = useBarcodeLookup();
  const scoreMutation = useScoreFood();

  const handleSearch = () => {
    if (query.trim()) searchMutation.mutate(query.trim());
  };

  const handleBarcode = () => {
    if (barcodeInput.trim()) barcodeMutation.mutate(barcodeInput.trim());
  };

  const handleScore = async (productId: string) => {
    const result = await scoreMutation.mutateAsync({ productId, clientId, shopId });
    return result;
  };

  const allResults = [
    ...(searchMutation.data?.cached || []).map((p: any) => ({ ...p, _source: 'cached' })),
    ...(searchMutation.data?.off_results || []).map((p: any) => ({ ...p, _source: 'off' })),
    ...(searchMutation.data?.usda_results || []).map((p: any) => ({ ...p, _source: 'usda' })),
  ];

  const barcodeResult = barcodeMutation.data?.product;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Food Search
          </CardTitle>
          <div className="flex gap-1">
            <Button variant={mode === 'search' ? 'default' : 'outline'} size="sm" onClick={() => setMode('search')}>
              <Search className="h-3.5 w-3.5 mr-1" />Search
            </Button>
            <Button variant={mode === 'barcode' ? 'default' : 'outline'} size="sm" onClick={() => setMode('barcode')}>
              <Barcode className="h-3.5 w-3.5 mr-1" />Barcode
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'search' ? (
          <div className="flex gap-2">
            <Input
              placeholder="Search foods (e.g., chicken breast, oatmeal...)"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searchMutation.isPending || !query.trim()}>
              {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode number..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBarcode()}
            />
            <Button onClick={handleBarcode} disabled={barcodeMutation.isPending || !barcodeInput.trim()}>
              {barcodeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Barcode className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Search Results */}
        {allResults.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allResults.map((product: any, idx: number) => (
              <div key={product.id || product.external_id || idx} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => onSelectProduct?.(product)}>
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {product.brand && <span className="text-xs text-muted-foreground">{product.brand}</span>}
                    {product.nutriscore_grade && (
                      <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded uppercase ${getNutriScoreColor(product.nutriscore_grade)}`}>
                        {product.nutriscore_grade}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">{product._source}</Badge>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold">{Math.round(product.calories_per_serving || product.nutrients?.calories?.amount || 0)} kcal</p>
                  <p className="text-muted-foreground">per 100g</p>
                </div>
                {onLogFood && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); onLogFood(product); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Barcode Result */}
        {barcodeResult && (
          <div className="p-4 rounded-lg border border-border bg-accent/30">
            <div className="flex items-center gap-3">
              {barcodeResult.image_url && <img src={barcodeResult.image_url} alt={barcodeResult.name} className="h-16 w-16 rounded-lg object-cover" />}
              <div className="flex-1">
                <p className="font-semibold">{barcodeResult.name}</p>
                {barcodeResult.brand && <p className="text-sm text-muted-foreground">{barcodeResult.brand}</p>}
                {barcodeResult.nutriscore_grade && (
                  <span className={`text-xs font-bold text-white px-2 py-0.5 rounded uppercase mt-1 inline-block ${getNutriScoreColor(barcodeResult.nutriscore_grade)}`}>
                    Nutri-Score {barcodeResult.nutriscore_grade}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
              {(barcodeResult.nt_food_product_nutrients || []).filter((n: any) => ['calories', 'protein', 'carbohydrates', 'fat'].includes(n.nutrient_name)).map((n: any) => (
                <div key={n.nutrient_name} className="p-2 bg-background rounded-lg">
                  <p className="font-bold text-sm">{Math.round(n.amount)}{n.unit === 'kcal' ? '' : 'g'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{n.nutrient_name}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              {onSelectProduct && <Button size="sm" variant="outline" onClick={() => onSelectProduct(barcodeResult)} className="flex-1">View Details</Button>}
              {onLogFood && <Button size="sm" onClick={() => onLogFood(barcodeResult)} className="flex-1"><Plus className="h-3.5 w-3.5 mr-1" />Log</Button>}
            </div>
          </div>
        )}

        {barcodeMutation.isSuccess && !barcodeResult && (
          <p className="text-sm text-muted-foreground text-center py-4">No product found for this barcode.</p>
        )}
      </CardContent>
    </Card>
  );
}
