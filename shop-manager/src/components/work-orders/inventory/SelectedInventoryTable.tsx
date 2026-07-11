
import React from "react";
import { WorkOrderInventoryItem } from "@/types/workOrder";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

export interface SelectedInventoryTableProps {
  items: WorkOrderInventoryItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function SelectedInventoryTable({
  items,
  onUpdateQuantity,
  onRemove
}: SelectedInventoryTableProps) {
  if (!items.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No inventory items added to this work order.
      </div>
    );
  }

  const handleQuantityChange = (id: string, value: string) => {
    const quantity = parseInt(value, 10);
    if (!isNaN(quantity) && quantity >= 0) {
      onUpdateQuantity(id, quantity);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Part #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.sku}</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell className="text-right">
              <Input
                type="number"
                min="0"
                value={item.quantity}
                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                className="w-20 text-right"
              />
            </TableCell>
            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(item.quantity * item.unit_price)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
