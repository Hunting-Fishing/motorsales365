import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useInventoryAnalytics } from '@/hooks/inventory/useInventoryAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, BarChart3 } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function InventoryAnalyticsDashboard() {
  const { analytics, isLoading } = useInventoryAnalytics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${analytics.totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{analytics.totalItems}</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-warning">{analytics.lowStockItems}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Turnover Rate</p>
                <p className="text-2xl font-bold">{analytics.turnoverRate.toFixed(1)}x</p>
              </div>
              <BarChart3 className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categories by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topCategories.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Value']} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Value Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.stockTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Value']} />
                <Line type="monotone" dataKey="totalValue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topSuppliers.slice(0, 5).map((supplier, index) => (
                <div key={supplier.supplier} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{supplier.supplier}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${supplier.value.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{supplier.count} items</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Movement */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Movement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.monthlyMovement}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="added" fill="hsl(var(--success))" name="Added" />
                <Bar dataKey="removed" fill="hsl(var(--destructive))" name="Removed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Status */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">In Stock</span>
                  <span className="text-sm font-medium">
                    {analytics.totalItems - analytics.outOfStockItems - analytics.lowStockItems}
                  </span>
                </div>
                <Progress 
                  value={(analytics.totalItems - analytics.outOfStockItems - analytics.lowStockItems) / analytics.totalItems * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-warning">Low Stock</span>
                  <span className="text-sm font-medium">{analytics.lowStockItems}</span>
                </div>
                <Progress 
                  value={analytics.lowStockItems / analytics.totalItems * 100} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-destructive">Out of Stock</span>
                  <span className="text-sm font-medium">{analytics.outOfStockItems}</span>
                </div>
                <Progress 
                  value={analytics.outOfStockItems / analytics.totalItems * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}