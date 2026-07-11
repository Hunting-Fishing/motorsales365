import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Tag, Percent } from 'lucide-react';
import { CartItem } from '@/hooks/shopping/useCart';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { useShopId } from '@/hooks/useShopId';

interface OrderSummaryProps {
  items: CartItem[];
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({ items }) => {
  const { shopId } = useShopId();
  const { taxSettings } = useTaxSettings(shopId || undefined);
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate tax using centralized tax settings
  const taxRate = (taxSettings.parts_tax_rate || 0) / 100;
  const tax = subtotal * taxRate;
  
  const shipping = 0; // Free standard shipping
  const total = Number(subtotal + tax + shipping);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center space-x-3 py-2">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                className="w-12 h-12 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-medium text-sm">
                  {item.variantName ? `${item.name} (${item.variantName})` : 
                   item.bundleName ? item.bundleName : item.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {item.manufacturer} • {item.category}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                  {item.appliedDiscounts && item.appliedDiscounts.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">
                        {item.appliedDiscounts.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex flex-col items-end">
                  <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  {item.originalPrice && item.originalPrice !== item.price && (
                    <p className="text-xs text-muted-foreground line-through">
                      ${(item.originalPrice * item.quantity).toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    ${item.price.toFixed(2)} each
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Separator className="my-4" />
        
        {/* Summary */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          {/* Show total savings if any discounts applied */}
          {items.some(item => item.originalPrice && item.originalPrice > item.price) && (
            <div className="flex justify-between text-sm text-green-600">
              <span className="flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                Total Savings
              </span>
              <span>
                -${items.reduce((total, item) => {
                  if (item.originalPrice && item.originalPrice > item.price) {
                    return total + ((item.originalPrice - item.price) * item.quantity);
                  }
                  return total;
                }, 0).toFixed(2)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span>{taxSettings.tax_description || 'Tax'} ({(taxSettings.parts_tax_rate || 0).toFixed(1)}%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center">
              <Truck className="h-4 w-4 mr-1" />
              Shipping
            </span>
            <span className="text-green-600">FREE</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};