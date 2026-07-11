import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  DollarSign, 
  AlertTriangle, 
  TrendingDown,
  TrendingUp,
  Plus,
  Search
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface InventoryStatsCardsProps {
  stats: InventoryStats;
  onLowStockClick?: () => void;
  onOutOfStockClick?: () => void;
}

export function InventoryStatsCards({ 
  stats, 
  onLowStockClick, 
  onOutOfStockClick 
}: InventoryStatsCardsProps) {
  const navigate = useNavigate();

  const statCards = [
    {
      title: 'Total Items',
      value: stats.totalItems.toLocaleString(),
      icon: Package,
      description: 'Items in inventory',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      action: {
        label: 'View All',
        onClick: () => navigate('/inventory')
      }
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      description: 'Inventory worth',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      trend: stats.totalValue > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Low Stock',
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      description: 'Items need reordering',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      alert: stats.lowStockCount > 0,
      action: stats.lowStockCount > 0 ? {
        label: 'Review',
        onClick: onLowStockClick
      } : undefined
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStockCount.toString(),
      icon: TrendingDown,
      description: 'Items unavailable',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      alert: stats.outOfStockCount > 0,
      action: stats.outOfStockCount > 0 ? {
        label: 'Urgent',
        onClick: onOutOfStockClick
      } : undefined
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trend === 'up' ? TrendingUp : TrendingDown;
        
        return (
          <Card 
            key={index}
            className={`
              relative overflow-hidden transition-all duration-200 hover:shadow-lg
              ${card.alert ? 'ring-2 ring-red-200 bg-red-50/30' : 'hover:border-primary/20'}
            `}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{card.value}</div>
                  {card.trend && (
                    <div className={`flex items-center ${
                      card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
                
                {card.alert && (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200">
                    Needs Attention
                  </Badge>
                )}
                
                {card.action && (
                  <Button
                    variant={card.alert ? "destructive" : "outline"}
                    size="sm"
                    onClick={card.action.onClick}
                    className="w-full mt-2 text-xs"
                  >
                    {card.alert && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {card.action.label}
                  </Button>
                )}
              </div>
            </CardContent>
            
            {/* Background decoration */}
            <div className={`
              absolute top-0 right-0 w-20 h-20 opacity-10 transform translate-x-6 -translate-y-6
              ${card.bgColor}
            `} />
          </Card>
        );
      })}
    </div>
  );
}