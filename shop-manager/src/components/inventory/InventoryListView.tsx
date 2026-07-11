import React from 'react';
import { InventoryItemExtended } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Edit, 
  MoreVertical, 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Eye
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useInventoryView } from '@/contexts/InventoryViewContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface InventoryListViewProps {
  items: InventoryItemExtended[];
  onUpdateItem?: (id: string, updates: Partial<InventoryItemExtended>) => Promise<InventoryItemExtended>;
}

export function InventoryListView({ items, onUpdateItem }: InventoryListViewProps) {
  const navigate = useNavigate();
  const { selectedItems, toggleItemSelection } = useInventoryView();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in stock':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'low stock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out of stock':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'discontinued':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStockLevel = (item: InventoryItemExtended) => {
    const quantity = Number(item.quantity) || 0;
    const reorderPoint = Number(item.reorder_point) || 0;
    
    if (quantity <= 0) return { level: 'out', color: 'text-red-600', icon: AlertTriangle };
    if (quantity <= reorderPoint) return { level: 'low', color: 'text-yellow-600', icon: AlertTriangle };
    return { level: 'good', color: 'text-green-600', icon: TrendingUp };
  };

  const handleEdit = (item: InventoryItemExtended) => {
    console.log('Edit item:', item);
  };

  const handleDelete = (id: string) => {
    console.log('Delete item:', id);
  };

  const handleViewDetails = (id: string) => {
    navigate(`/inventory/item/${id}`);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const stockInfo = getStockLevel(item);
        const StockIcon = stockInfo.icon;
        const isSelected = selectedItems.includes(item.id);

        return (
          <div
            key={item.id}
            className={`
              group flex items-center space-x-4 p-4 bg-card rounded-lg border 
              transition-all duration-300 ease-in-out transform hover:scale-[1.02]
              hover:shadow-lg hover:border-primary/30 cursor-pointer animate-fade-in
              ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-md' : ''}
            `}
            style={{ animationDelay: `${index * 30}ms` }}
            onClick={() => handleViewDetails(item.id)}
          >
            {/* Selection Checkbox */}
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleItemSelection(item.id)}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            />

            {/* Item Icon */}
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              {/* Item Info */}
              <div className="md:col-span-2 min-w-0">
                <h3 className="font-medium text-card-foreground truncate group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Status & Stock */}
              <div className="flex flex-col space-y-2">
                <Badge className={getStatusColor(item.status)} variant="outline">
                  {item.status}
                </Badge>
                <div className={`flex items-center space-x-1 ${stockInfo.color}`}>
                  <StockIcon className="h-3 w-3" />
                  <span className="text-xs font-medium">{item.quantity} units</span>
                </div>
              </div>

              {/* Category & Location */}
              <div className="text-sm space-y-1">
                {item.category && (
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <span className="ml-1 font-medium">{item.category}</span>
                  </div>
                )}
                {item.location && (
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <span className="ml-1 font-medium">{item.location}</span>
                  </div>
                )}
              </div>

              {/* Price Info */}
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Unit Price:</span>
                  <span className="ml-1 font-semibold">{formatCurrency(item.unit_price)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="ml-1 font-semibold">{formatCurrency(item.unit_price * item.quantity)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Eye className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(item.id);
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(item);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="text-red-600"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}