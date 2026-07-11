
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Percent, DollarSign } from 'lucide-react';
import { JobLineDiscount, PartDiscount, WorkOrderDiscount } from '@/types/discount';

interface DiscountDisplayProps {
  discounts: (JobLineDiscount | PartDiscount | WorkOrderDiscount)[];
  onRemoveDiscount?: (discountId: string) => Promise<void>;
  isEditMode?: boolean;
  showTotal?: boolean;
}

export function DiscountDisplay({ 
  discounts, 
  onRemoveDiscount, 
  isEditMode = false,
  showTotal = false 
}: DiscountDisplayProps) {
  if (discounts.length === 0) {
    return null;
  }

  const totalDiscountAmount = discounts.reduce((sum, discount) => sum + discount.discount_amount, 0);

  return (
    <div className="space-y-2">
      {discounts.map((discount) => (
        <div
          key={discount.id}
          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {discount.discount_type === 'percentage' ? (
                <Percent className="h-4 w-4 text-green-600" />
              ) : (
                <DollarSign className="h-4 w-4 text-green-600" />
              )}
              <span className="font-medium text-green-800">{discount.discount_name}</span>
            </div>
            
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              {discount.discount_type === 'percentage' 
                ? `${discount.discount_value}%` 
                : `$${discount.discount_value.toFixed(2)}`}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-medium text-green-700">
              -${discount.discount_amount.toFixed(2)}
            </span>
            
            {isEditMode && onRemoveDiscount && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveDiscount(discount.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {showTotal && discounts.length > 1 && (
        <div className="flex justify-between items-center p-3 bg-green-100 border border-green-300 rounded-lg font-semibold">
          <span className="text-green-800">Total Discounts Applied:</span>
          <span className="text-green-700">-${totalDiscountAmount.toFixed(2)}</span>
        </div>
      )}

      {discounts.some(d => d.reason) && (
        <div className="text-xs text-muted-foreground">
          {discounts
            .filter(d => d.reason)
            .map(d => d.reason)
            .join(', ')}
        </div>
      )}
    </div>
  );
}
