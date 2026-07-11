
import React from 'react';
import { WorkOrderInventoryItem } from '@/types/workOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { WorkOrderInventoryTable } from './WorkOrderInventoryTable';

interface WorkOrderInventorySectionProps {
  workOrderId: string;
  inventoryItems: WorkOrderInventoryItem[];
  isEditMode?: boolean;
}

export function WorkOrderInventorySection({
  workOrderId,
  inventoryItems,
  isEditMode = false
}: WorkOrderInventorySectionProps) {
  const totalValue = inventoryItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      {/* Inventory Summary */}
      {inventoryItems.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Items</p>
                  <p className="text-2xl font-bold">{inventoryItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">
                    {inventoryItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inventory Items</CardTitle>
            {isEditMode && (
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Inventory Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {inventoryItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inventory items added yet</p>
              {isEditMode && (
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <WorkOrderInventoryTable 
              items={inventoryItems}
              readonly={!isEditMode}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
