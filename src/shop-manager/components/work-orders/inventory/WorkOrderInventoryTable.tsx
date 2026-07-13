
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { WorkOrderInventoryItem } from "@/types/workOrder"; // Updated import

interface WorkOrderInventoryTableProps {
  items: WorkOrderInventoryItem[];
  onRemoveItem?: (id: string) => void;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  readonly?: boolean;
}

export const WorkOrderInventoryTable: React.FC<WorkOrderInventoryTableProps> = ({ 
  items, 
  onRemoveItem,
  onUpdateQuantity,
  readonly = false
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No inventory items added yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Unit Price</TableHead>
          <TableHead className="text-right">Total</TableHead>
          {!readonly && <TableHead></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.sku}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell className="text-right">{item.quantity}</TableCell>
            <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
            <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
            {!readonly && (
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem && onRemoveItem(item.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default WorkOrderInventoryTable;
