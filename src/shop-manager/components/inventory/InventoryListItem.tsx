import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InventoryItemExtended } from '@/types/inventory';
import { Package, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InventoryListItemProps {
  item: InventoryItemExtended;
  onUpdateItem: (id: string, updates: Partial<InventoryItemExtended>) => Promise<InventoryItemExtended>;
}

export function InventoryListItem({ item, onUpdateItem }: InventoryListItemProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in stock':
        return 'bg-success/10 text-success border-success/20';
      case 'low stock':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'out of stock':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-border';
    }
  };

  const totalValue = (item.quantity || 0) * (item.unit_price || 0);

  return (
    <Card className="hover:shadow-md transition-all duration-200 hover-scale">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {item.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    SKU: {item.sku}
                  </p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                
                <div className="ml-4 text-right">
                  <p className="font-semibold text-foreground">
                    ${totalValue.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} units
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(item.status || '')}>
                    {item.status || 'Unknown'}
                  </Badge>
                  {item.category && (
                    <Badge variant="outline">
                      {item.category}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/inventory/item/${item.id}`)}
                    className="hover:bg-primary/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/inventory/item/${item.id}?edit=true`)}
                    className="hover:bg-primary/10"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}