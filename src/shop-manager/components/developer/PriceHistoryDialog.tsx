import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { productPriceHistoryService, PriceHistoryEntry } from '@/services/productPriceHistoryService';
import { format } from 'date-fns';

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

export function PriceHistoryDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: PriceHistoryDialogProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['price-history', productId],
    queryFn: () => productPriceHistoryService.getPriceHistory(productId),
    enabled: open && !!productId,
  });

  const getPriceTrend = (index: number) => {
    if (index >= history.length - 1) return 'same';
    const current = history[index].price;
    const previous = history[index + 1].price;
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'same';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Price History
          </DialogTitle>
          <DialogDescription className="truncate">
            {productName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No price history available</p>
            <p className="text-sm mt-1">Price changes will appear here when recorded</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {history.map((entry, index) => {
                const trend = getPriceTrend(index);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {getTrendIcon(trend)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatPrice(entry.price)}
                          </span>
                          {entry.salePrice && (
                            <Badge variant="secondary" className="text-xs">
                              Sale: {formatPrice(entry.salePrice)}
                            </Badge>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[250px] truncate">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.date), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
