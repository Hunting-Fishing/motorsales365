import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardHat, Package, AlertTriangle, MapPin } from 'lucide-react';
import { PPEItem } from '@/hooks/usePPEManagement';

interface PPEInventoryCardProps {
  item: PPEItem;
  onClick?: () => void;
}

export const PPEInventoryCard = ({ item, onClick }: PPEInventoryCardProps) => {
  const isLowStock = item.quantity_in_stock <= (item.minimum_stock_level || 5);

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HardHat className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">{item.name}</h3>
              <Badge variant="outline" className="text-xs">
                {item.category}
              </Badge>
              {item.manufacturer && (
                <p className="text-xs text-muted-foreground">
                  {item.manufacturer} {item.model_number && `- ${item.model_number}`}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className={`font-semibold ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
                {item.quantity_in_stock}
              </span>
            </div>
            {isLowStock && (
              <div className="flex items-center gap-1 text-destructive mt-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">Low stock</span>
              </div>
            )}
          </div>
        </div>
        {item.storage_location && (
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {item.storage_location}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          {item.expiry_tracking && (
            <Badge variant="secondary" className="text-xs">Expiry Tracked</Badge>
          )}
          {item.certification_required && (
            <Badge variant="secondary" className="text-xs">Cert Required</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
