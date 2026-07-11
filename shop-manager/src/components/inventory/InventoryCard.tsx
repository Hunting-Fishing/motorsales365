import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InventoryItemExtended } from '@/types/inventory';
import { 
  Edit, 
  MoreVertical, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart,
  Eye,
  Trash2,
  Copy,
  Star,
  MapPin
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InventoryCardProps {
  item: InventoryItemExtended;
  onEdit?: (item: InventoryItemExtended) => void;
  onDelete?: (id: string) => void;
  onReorder?: (id: string) => void;
  onDuplicate?: (item: InventoryItemExtended) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showSelection?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function InventoryCard({ 
  item, 
  onEdit, 
  onDelete, 
  onReorder,
  onDuplicate,
  isSelected = false, 
  onToggleSelect,
  showSelection = false,
  variant = 'default'
}: InventoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in stock':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
      case 'low stock':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
      case 'out of stock':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      case 'discontinued':
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    }
  };

  const getPriorityLevel = () => {
    const quantity = Number(item.quantity) || 0;
    const reorderPoint = Number(item.reorder_point) || 0;
    
    if (quantity <= 0) return 'critical';
    if (quantity <= reorderPoint) return 'warning';
    if (quantity <= reorderPoint * 1.5) return 'attention';
    return 'normal';
  };

  const getStockLevel = () => {
    const quantity = Number(item.quantity) || 0;
    const reorderPoint = Number(item.reorder_point) || 0;
    
    if (quantity <= 0) return { level: 'out', color: 'text-red-600', icon: AlertTriangle };
    if (quantity <= reorderPoint) return { level: 'low', color: 'text-yellow-600', icon: AlertTriangle };
    return { level: 'good', color: 'text-green-600', icon: TrendingUp };
  };

  const stockInfo = getStockLevel();
  const StockIcon = stockInfo.icon;

  const handleCardClick = () => {
    navigate(`/inventory/item/${item.id}`);
  };

  const priorityLevel = getPriorityLevel();
  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <TooltipProvider>
      <Card 
        className={`
          group relative transition-all duration-300 cursor-pointer
          ${isSelected 
            ? 'ring-2 ring-primary border-primary shadow-lg scale-[1.02]' 
            : 'hover:border-primary/30 hover:shadow-xl hover:-translate-y-1'
          }
          ${priorityLevel === 'critical' ? 'border-l-4 border-l-red-500' : ''}
          ${priorityLevel === 'warning' ? 'border-l-4 border-l-amber-500' : ''}
          ${variant === 'compact' ? 'h-32' : variant === 'detailed' ? 'min-h-64' : 'h-48'}
          bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm
          hover:from-card hover:to-card/90
        `}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Selection Checkbox */}
        {showSelection && (
          <div className="absolute top-3 left-3 z-10">
            <Checkbox 
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.(item.id)}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border-2 shadow-sm"
            />
          </div>
        )}

        {/* Priority Indicator */}
        {priorityLevel !== 'normal' && (
          <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${
            priorityLevel === 'critical' ? 'bg-red-500 animate-pulse' :
            priorityLevel === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
          }`} />
        )}

        <CardHeader className={`pb-3 ${showSelection ? 'pt-8' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Product Icon/Image */}
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                transition-all duration-300 group-hover:scale-110
                ${priorityLevel === 'critical' ? 'bg-red-100 text-red-600' :
                  priorityLevel === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-gradient-to-br from-primary/10 to-primary/20 text-primary'
                }
              `}>
                <Package className="h-6 w-6" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-card-foreground truncate group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  {item.partNumber && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          {item.partNumber}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Part Number: {item.partNumber}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  {item.location && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{item.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className={`flex items-center space-x-1 transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick();
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Details</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick();
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {onEdit && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Item
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(item);
                    }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onReorder && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onReorder(item.id);
                    }}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Reorder
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Status and Stock Level */}
          <div className="flex items-center justify-between">
            <Badge className={`${getStatusColor(item.status)} transition-colors`} variant="outline">
              {item.status}
            </Badge>
            <div className={`flex items-center space-x-1 ${stockInfo.color}`}>
              <StockIcon className="h-4 w-4" />
              <span className="text-sm font-semibold">{item.quantity}</span>
              <span className="text-xs text-muted-foreground">units</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Unit Price</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(item.unit_price)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Value</p>
              <p className="text-lg font-bold">{formatCurrency(item.unit_price * item.quantity)}</p>
            </div>
          </div>

          {variant === 'detailed' && (
            <>
              {/* Extended Metrics */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">On Order</p>
                  <p className="font-semibold">{item.onOrder || 0}</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Reorder Point</p>
                  <p className="font-semibold">{item.reorder_point || 0}</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Markup</p>
                  <p className="font-semibold">{item.marginMarkup || 0}%</p>
                </div>
              </div>

              {/* Detailed Info */}
              <div className="space-y-2 text-sm">
                {item.category && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Category:</span>
                    <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                  </div>
                )}
                {item.subcategory && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subcategory:</span>
                    <Badge variant="outline" className="text-xs">{item.subcategory}</Badge>
                  </div>
                )}
                {item.supplier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="font-medium truncate max-w-32">{item.supplier}</span>
                  </div>
                )}
                {item.manufacturer && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand:</span>
                    <span className="font-medium truncate max-w-32">{item.manufacturer}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {variant !== 'detailed' && (
            /* Compact Info */
            <div className="space-y-1.5 text-sm">
              {item.category && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Category:</span>
                  <Badge variant="secondary" className="text-xs h-5">{item.category}</Badge>
                </div>
              )}
              {item.supplier && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Supplier:</span>
                  <span className="font-medium text-xs truncate max-w-24">{item.supplier}</span>
                </div>
              )}
            </div>
          )}

          {/* Stock Warning */}
          {stockInfo.level !== 'good' && (
            <div className={`p-2.5 rounded-lg border ${
              stockInfo.level === 'out' 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p className="text-xs font-medium">
                  {stockInfo.level === 'out' 
                    ? 'Out of stock - Immediate reorder needed' 
                    : `Low stock - Reorder when below ${item.reorder_point} units`
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}