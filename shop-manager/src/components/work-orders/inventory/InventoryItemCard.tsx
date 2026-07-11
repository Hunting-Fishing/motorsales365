
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { InventoryItemExtended } from "@/types/inventory";

interface InventoryItemCardProps {
  item: InventoryItemExtended;
  onAddItem?: (item: InventoryItemExtended) => void;
}

export function InventoryItemCard({ item, onAddItem }: InventoryItemCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "bg-green-100 text-green-800 border-green-200";
      case "Low Stock": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Out of Stock": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-grow p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium truncate">{item.name}</h3>
          <Badge 
            variant="outline" 
            className={`ml-2 ${getStatusColor(item.status)}`}
          >
            {item.status}
          </Badge>
        </div>
        
        <p className="text-xs text-muted-foreground mb-2">SKU: {item.sku}</p>
        
        {item.description && (
          <p className="text-sm line-clamp-2 mb-3">{item.description}</p>
        )}
        
        <div className="flex justify-between items-end mt-auto">
          <div>
            <p className="text-sm font-medium">
              {formatCurrency(item.unit_price)}
            </p>
            <p className="text-xs text-muted-foreground">
              Available: {item.quantity}
            </p>
          </div>
          
          {onAddItem && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAddItem(item)} 
              disabled={item.quantity <= 0}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
