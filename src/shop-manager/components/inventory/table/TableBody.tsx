
import React from "react";
import { TableBody as UITableBody } from "@/components/ui/table";
import { InventoryItemExtended } from "@/types/inventory";
import { TableRow } from "./TableRow";
import { Column } from "./SortableColumnHeader";

interface TableBodyProps {
  items: InventoryItemExtended[];
  visibleColumns: Column[];
  onRowClick?: (itemId: string) => void;
}

export function TableBody({ items, visibleColumns, onRowClick }: TableBodyProps) {
  if (!items.length) {
    return null;
  }

  return (
    <UITableBody>
      {items.map((item) => (
        <TableRow
          key={item.id}
          item={item}
          visibleColumns={visibleColumns}
          onRowClick={onRowClick}
        />
      ))}
    </UITableBody>
  );
}
