
import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Column } from './SortableColumnHeader';

interface InventoryTableHeaderProps {
  columns?: Column[];
  setColumns?: React.Dispatch<React.SetStateAction<Column[]>>;
}

export function InventoryTableHeader({ columns, setColumns }: InventoryTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>SKU</TableHead>
        <TableHead>Category</TableHead>
        <TableHead className="text-right">Quantity</TableHead>
        <TableHead className="text-right">Price/Unit</TableHead>
        <TableHead className="text-right">Total Value</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Location</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Export the component with the expected name
export { InventoryTableHeader as TableHeader };
