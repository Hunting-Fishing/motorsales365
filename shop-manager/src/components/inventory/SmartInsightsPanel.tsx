import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  DollarSign,
  ShoppingCart,
  Clock,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { InventoryItemExtended } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';

interface SmartInsightsPanelProps {
  items: InventoryItemExtended[];
  stats: {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export function SmartInsightsPanel({ items, stats }: SmartInsightsPanelProps) {
  // Calculate insights
  const insights = React.useMemo(() => {
    const categoryAnalysis = items.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0, lowStock: 0 };
      }
      acc[category].count += 1;
      acc[category].value += (item.unit_price || 0) * (item.quantity || 0);
      if ((item.quantity || 0) <= (item.reorder_point || 0)) {
        acc[category].lowStock += 1;
      }
      return acc;
    }, {} as Record<string, { count: number; value: number; lowStock: number }>);

    const topCategories = Object.entries(categoryAnalysis)
      .sort(([,a], [,b]) => b.value - a.value)
      .slice(0, 5);

    const reorderCandidates = items
      .filter(item => (item.quantity || 0) <= (item.reorder_point || 0))
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 5);

    const highValueItems = items
      .filter(item => (item.unit_price || 0) * (item.quantity || 0) > 1000)
      .sort((a, b) => (b.unit_price || 0) * (b.quantity || 0) - (a.unit_price || 0) * (a.quantity || 0))
      .slice(0, 5);

    const stockHealthScore = Math.max(0, Math.min(100, 
      ((items.length - stats.lowStockCount - stats.outOfStockCount) / Math.max(1, items.length)) * 100
    ));

    const averageValue = stats.totalValue / Math.max(1, stats.totalItems);

    return {
      categoryAnalysis: topCategories,
      reorderCandidates,
      highValueItems,
      stockHealthScore,
      averageValue
    };
  }, [items, stats]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-200';
    if (score >= 60) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Stock Health Score */}
      <Card className="lg:col-span-2 xl:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2 text-primary" />
              Stock Health
            </CardTitle>
            <Badge variant="outline" className={getHealthBg(insights.stockHealthScore)}>
              {insights.stockHealthScore.toFixed(0)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Health Score</span>
              <span className={`font-medium ${getHealthColor(insights.stockHealthScore)}`}>
                {insights.stockHealthScore.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={insights.stockHealthScore} 
              className="h-2"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">In Stock</p>
              <p className="text-lg font-bold text-green-600">
                {stats.totalItems - stats.lowStockCount - stats.outOfStockCount}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Need Attention</p>
              <p className="text-lg font-bold text-red-600">
                {stats.lowStockCount + stats.outOfStockCount}
              </p>
            </div>
          </div>

          <Button size="sm" className="w-full" variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            View All Alerts
          </Button>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-primary" />
            Top Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.categoryAnalysis.map(([category, data], index) => (
            <div key={category} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  index === 0 ? 'bg-green-500' : 
                  index === 1 ? 'bg-blue-500' : 
                  index === 2 ? 'bg-purple-500' : 'bg-gray-400'
                }`} />
                <span className="font-medium text-sm">{category}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(data.value)}</p>
                <p className="text-xs text-muted-foreground">{data.count} items</p>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-full mt-3">
            View Category Analytics
          </Button>
        </CardContent>
      </Card>

      {/* Reorder Candidates */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-amber-600" />
              Reorder Now
            </CardTitle>
            <Badge variant="destructive">
              {insights.reorderCandidates.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.reorderCandidates.length > 0 ? (
            <>
              {insights.reorderCandidates.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg border border-amber-200 bg-amber-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} left • Reorder at {item.reorder_point}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="ml-2">
                    <ShoppingCart className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button size="sm" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Quick Reorder All
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <Package className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground">All items well stocked!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* High Value Items */}
      <Card className="lg:col-span-2 xl:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            High Value Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.highValueItems.length > 0 ? (
            insights.highValueItems.map((item) => {
              const totalValue = (item.unit_price || 0) * (item.quantity || 0);
              return (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unit_price || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">{formatCurrency(totalValue)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4">
              <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No high-value items found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Package className="h-6 w-6 mx-auto text-blue-600 mb-1" />
              <p className="text-2xl font-bold text-blue-700">{stats.totalItems}</p>
              <p className="text-xs text-blue-600">Total Items</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
              <DollarSign className="h-6 w-6 mx-auto text-green-600 mb-1" />
              <p className="text-2xl font-bold text-green-700">{formatCurrency(insights.averageValue)}</p>
              <p className="text-xs text-green-600">Avg. Value</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <Clock className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
              <p className="text-2xl font-bold text-yellow-700">{stats.lowStockCount}</p>
              <p className="text-xs text-yellow-600">Low Stock</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-1" />
              <p className="text-2xl font-bold text-red-700">{stats.outOfStockCount}</p>
              <p className="text-xs text-red-600">Out of Stock</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}