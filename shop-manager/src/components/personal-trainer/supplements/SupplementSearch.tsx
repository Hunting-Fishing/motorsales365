import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';

interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands?: string;
  image_url?: string;
  categories?: string;
  nutriments?: Record<string, any>;
}

export function SupplementSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const { toast } = useToast();
  const { shopId } = useShopId();

  const searchProducts = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&tagtype_0=categories&tag_contains_0=contains&tag_0=supplements`
      );
      const data = await res.json();
      setResults((data.products || []).filter((p: any) => p.product_name));
    } catch {
      toast({ title: 'Search failed', description: 'Could not reach Open Food Facts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const importProduct = async (product: OpenFoodFactsProduct) => {
    if (!shopId) return;
    setImporting(product.code);
    try {
      const { error } = await supabase.from('pt_supplements').insert({
        shop_id: shopId,
        name: product.product_name,
        category: 'other',
        description: product.categories || '',
        image_url: product.image_url || '',
        barcode: product.code,
      } as any);
      if (error) throw error;
      toast({ title: 'Imported', description: `${product.product_name} added to your catalog` });
    } catch {
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search supplements on Open Food Facts..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && searchProducts()}
        />
        <Button onClick={searchProducts} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {results.map(product => (
            <Card key={product.code} className="border-border/50">
              <CardContent className="p-3 flex gap-3">
                {product.image_url && (
                  <img src={product.image_url} alt={product.product_name}
                    className="w-16 h-16 object-cover rounded-lg shrink-0" />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-sm font-medium text-foreground truncate">{product.product_name}</h4>
                  {product.brands && <p className="text-xs text-muted-foreground">{product.brands}</p>}
                  <Badge variant="outline" className="text-[10px]">{product.code}</Badge>
                </div>
                <Button size="sm" variant="outline"
                  disabled={importing === product.code}
                  onClick={() => importProduct(product)}>
                  {importing === product.code
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Plus className="h-3 w-3" />
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No results found. Try different search terms.
        </p>
      )}
    </div>
  );
}
