
import React, { useState } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { InventoryItemExtended } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { Column } from './SortableColumnHeader';

interface InventoryTableRowProps {
  item: InventoryItemExtended;
  onEdit?: (item: InventoryItemExtended) => void;
  onDelete?: (id: string) => void;
  visibleColumns?: Column[];
  onRowClick?: (itemId: string) => void;
}

export function InventoryTableRow({ item, onEdit, onDelete, visibleColumns, onRowClick }: InventoryTableRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in stock':
        return 'bg-green-100 text-green-800';
      case 'low stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out of stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRowClick = () => {
    if (onRowClick) {
      onRowClick(item.id);
    }
  };

  // Calculate per-unit price from total cost and quantity
  const totalCost = Number(item.unit_price) || 0;
  const quantity = Number(item.quantity) || 1;
  const pricePerUnit = quantity > 0 ? totalCost / quantity : 0;

  return (
    <TableRow 
      className="hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleRowClick}
    >
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell>{item.sku}</TableCell>
      <TableCell>{item.category}</TableCell>
      <TableCell className="text-right">{item.quantity}</TableCell>
      <TableCell className="text-right">{formatCurrency(pricePerUnit)}</TableCell>
      <TableCell className="text-right">{formatCurrency(totalCost)}</TableCell>
      <TableCell>
        <Badge className={getStatusColor(item.status)}>
          {item.status}
        </Badge>
      </TableCell>
      <TableCell>{item.location}</TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex space-x-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(item)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// Export the component with the expected name
export { InventoryTableRow as TableRow };
