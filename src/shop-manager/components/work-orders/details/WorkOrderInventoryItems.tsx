
import React from 'react';
import { WorkOrderInventoryItem } from '@/types/workOrder';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export interface WorkOrderInventoryItemsProps {
  workOrderId: string;
  inventoryItems: WorkOrderInventoryItem[];
}

export const WorkOrderInventoryItems: React.FC<WorkOrderInventoryItemsProps> = ({ 
  workOrderId, 
  inventoryItems 
}) => {
  if (!inventoryItems.length) {
    return (
      <div className="py-8 text-center border rounded-md">
        <p className="text-muted-foreground">No inventory items assigned to this work order</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Inventory Items</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Unit Price</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventoryItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.sku}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>${item.unit_price.toFixed(2)}</TableCell>
              <TableCell>${item.total.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
