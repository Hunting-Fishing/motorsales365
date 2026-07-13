import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useOptimizedInventoryItems } from '@/hooks/inventory/useOptimizedInventoryItems';

interface InventoryIntegrationProps {
  productId: string;
  onStockUpdate?: (stockInfo: StockInfo) => void;
}

export interface StockInfo {
  inStock: boolean;
  quantity: number;
  lowStock: boolean;
  inventoryItemId?: string;
}

const InventoryIntegration: React.FC<InventoryIntegrationProps> = ({
  productId,
  onStockUpdate
}) => {
  const [stockInfo, setStockInfo] = useState<StockInfo>({
    inStock: true,
    quantity: 0,
    lowStock: false
  });
  
  const { items: inventoryItems, loading } = useOptimizedInventoryItems();

  useEffect(() => {
    // Try to find matching inventory item by product ID or name
    const matchingItem = inventoryItems.find(item => 
      item.id === productId || 
      item.sku === productId ||
      item.name.toLowerCase().includes(productId.toLowerCase())
    );

    if (matchingItem) {
      const newStockInfo: StockInfo = {
        inStock: matchingItem.quantity > 0,
        quantity: matchingItem.quantity,
        lowStock: matchingItem.quantity <= (matchingItem.reorder_point || 5),
        inventoryItemId: matchingItem.id
      };
      
      setStockInfo(newStockInfo);
      onStockUpdate?.(newStockInfo);
    } else {
      // No inventory tracking for this product
      const defaultStockInfo: StockInfo = {
        inStock: true,
        quantity: 999, // Unlimited stock
        lowStock: false
      };
      
      setStockInfo(defaultStockInfo);
      onStockUpdate?.(defaultStockInfo);
    }
  }, [inventoryItems, productId, onStockUpdate]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-16 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4" />
        <span className="font-medium">
          {stockInfo.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
        {stockInfo.lowStock && stockInfo.inStock && (
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            <TrendingDown className="h-3 w-3 mr-1" />
            Low Stock
          </Badge>
        )}
      </div>

      {stockInfo.inStock && (
        <div className="text-sm text-muted-foreground">
          {stockInfo.quantity === 999 ? (
            "In stock"
          ) : (
            `${stockInfo.quantity} available`
          )}
        </div>
      )}

      {stockInfo.lowStock && stockInfo.inStock && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Only {stockInfo.quantity} left in stock. Order soon!
          </AlertDescription>
        </Alert>
      )}

      {!stockInfo.inStock && (
        <Alert variant="destructive">
          <Package className="h-4 w-4" />
          <AlertDescription>
            This item is currently out of stock. Check back later or contact us for availability.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default InventoryIntegration;