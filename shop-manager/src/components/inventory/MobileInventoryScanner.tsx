import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Search, Package, Plus, Minus, Check } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function MobileInventoryScanner() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['mobile-inventory', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length > 0,
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, newQuantity }: { itemId: string; newQuantity: number }) => {
      const { error } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-inventory'] });
      toast({
        title: "Quantity Updated",
        description: "Inventory has been updated successfully.",
      });
      setSelectedItem(null);
      setAdjustmentQty(0);
    },
  });

  const handleScan = (code: string) => {
    setSearchQuery(code);
  };

  const handleAdjustment = (delta: number) => {
    setAdjustmentQty(prev => prev + delta);
  };

  const handleSaveAdjustment = () => {
    if (selectedItem && adjustmentQty !== 0) {
      const newQuantity = Math.max(0, selectedItem.quantity + adjustmentQty);
      updateQuantity.mutate({ itemId: selectedItem.id, newQuantity });
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKU or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              size="icon"
              onClick={() => setScannerOpen(true)}
              className="shrink-0"
            >
              <Camera className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected Item Detail */}
      {selectedItem && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">{selectedItem.name}</CardTitle>
            <p className="text-sm text-muted-foreground">SKU: {selectedItem.sku}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">{selectedItem.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adjustment</p>
                <p className={`text-2xl font-bold ${adjustmentQty > 0 ? 'text-green-600' : adjustmentQty < 0 ? 'text-red-600' : ''}`}>
                  {adjustmentQty > 0 ? '+' : ''}{adjustmentQty}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleAdjustment(-10)}
                className="h-16"
              >
                <div className="flex flex-col items-center">
                  <Minus className="h-5 w-5" />
                  <span className="text-xs">10</span>
                </div>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleAdjustment(-1)}
                className="h-16"
              >
                <div className="flex flex-col items-center">
                  <Minus className="h-5 w-5" />
                  <span className="text-xs">1</span>
                </div>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleAdjustment(1)}
                className="h-16"
              >
                <div className="flex flex-col items-center">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">1</span>
                </div>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleAdjustment(10)}
                className="h-16"
              >
                <div className="flex flex-col items-center">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">10</span>
                </div>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleAdjustment(100)}
                className="h-16"
              >
                <div className="flex flex-col items-center">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">100</span>
                </div>
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedItem(null);
                  setAdjustmentQty(0);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveAdjustment}
                disabled={adjustmentQty === 0 || updateQuantity.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchQuery && !selectedItem && (
        <div className="space-y-2">
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No items found</p>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{item.quantity}</p>
                      {item.quantity <= item.reorder_point && (
                        <Badge variant="destructive" className="text-xs">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </div>
  );
}
