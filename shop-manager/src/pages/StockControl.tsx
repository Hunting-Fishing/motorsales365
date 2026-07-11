
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Package, TrendingUp, AlertTriangle, Plus, Eye, ShoppingCart, Settings } from 'lucide-react';
import { useInventoryData } from '@/hooks/inventory/useInventoryData';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function StockControl() {
  const { inventoryStats, isLoading, error } = useInventoryData();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Stock Data</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stock Control</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/inventory/add">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/inventory">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/inventory" className="block">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventoryStats.totalItems}</div>
              <p className="text-xs text-muted-foreground">
                Items in inventory
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/inventory?status=low_stock" className="block">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${inventoryStats.lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${inventoryStats.lowStockCount > 0 ? 'text-destructive' : ''}`}>
                {inventoryStats.lowStockCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Need reordering
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/inventory/orders" className="block">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Movements</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/inventory" className="block">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${inventoryStats.totalValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total inventory value
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link to="/inventory/add">
                <Plus className="h-4 w-4 mr-2" />
                Add New Item
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link to="/inventory/orders">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link to="/inventory/categories">
                <Settings className="h-4 w-4 mr-2" />
                Manage Categories
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link to="/inventory/suppliers">
                <Eye className="h-4 w-4 mr-2" />
                Manage Suppliers
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryStats.lowStockCount > 0 || inventoryStats.outOfStockCount > 0 ? (
              <div className="space-y-3">
                {inventoryStats.outOfStockCount > 0 && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-destructive">
                        {inventoryStats.outOfStockCount} items out of stock
                      </span>
                    </div>
                    <Button variant="link" asChild className="p-0 h-auto text-destructive">
                      <Link to="/inventory?status=out_of_stock">View items</Link>
                    </Button>
                  </div>
                )}
                {inventoryStats.lowStockCount > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {inventoryStats.lowStockCount} items low on stock
                      </span>
                    </div>
                    <Button variant="link" asChild className="p-0 h-auto text-amber-600">
                      <Link to="/inventory?status=low_stock">View items</Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">All items are well stocked</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
