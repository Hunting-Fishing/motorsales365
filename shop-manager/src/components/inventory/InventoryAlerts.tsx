
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventoryManager } from '@/hooks/inventory/useInventoryManager';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function InventoryAlerts() {
  const { lowStockItems, outOfStockItems } = useInventoryManager();
  
  // Combine the alerts
  const totalAlerts = lowStockItems.length + outOfStockItems.length;
  
  return (
    <Card className="border-l-4 border-l-orange-400">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Inventory Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalAlerts > 0 ? (
          <div className="space-y-2">
            {lowStockItems.length > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-medium">
                  {lowStockItems.length} items low on stock
                </span>
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  Low Stock
                </span>
              </div>
            )}
            
            {outOfStockItems.length > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-medium">
                  {outOfStockItems.length} items out of stock
                </span>
                <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                  Out of Stock
                </span>
              </div>
            )}
            
            <Button variant="link" className="text-sm p-0 h-auto flex items-center" asChild>
              <Link to="/settings/inventory">
                Manage inventory settings <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No inventory alerts. All items are stocked appropriately.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
