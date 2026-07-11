
import React, { memo } from "react";
import { Table } from "@/components/ui/table";
import { InventoryItemExtended } from "@/types/inventory";
import { useNavigate } from "react-router-dom";
import { Column } from "./table/SortableColumnHeader";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";

interface ExcelViewTableProps {
  items: InventoryItemExtended[];
  columns: Column[];
}

export const ExcelViewTable = memo(({ items, columns }: ExcelViewTableProps) => {
  const navigate = useNavigate();
  const visibleColumns = columns.filter(col => col.visible);

  const renderCellValue = (item: InventoryItemExtended, columnId: string) => {
    switch (columnId) {
      case "status":
        return (
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 h-4 ${
              item.status?.toLowerCase() === 'in stock' ? 'bg-green-50 text-green-700 border-green-200' :
              item.status?.toLowerCase() === 'low stock' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              item.status?.toLowerCase() === 'out of stock' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-muted text-muted-foreground'
            }`}
          >
            {item.status}
          </Badge>
        );
      case "cost":
      case "unitPrice":
      case "totalValue":
        return formatCurrency(item[columnId] || 0);
      case "quantity":
      case "onOrder":
      case "reorderPoint":
        return (item[columnId] || 0).toString();
      default:
        return item[columnId as keyof InventoryItemExtended] || "-";
    }
  };

  return (
    <div className="rounded-md border overflow-auto bg-background">
      <Table className="text-[11px]">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          <tr className="border-b">
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="h-7 px-2 text-left align-middle font-medium text-muted-foreground text-[10px] uppercase tracking-tight whitespace-nowrap"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, rowIndex) => (
            <tr
              key={item.id}
              onClick={() => navigate(`/inventory/${item.id}`)}
              className={`
                cursor-pointer transition-colors hover:bg-muted/50
                ${rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
              `}
            >
              {visibleColumns.map((column) => (
                <td
                  key={`${item.id}-${column.id}`}
                  className="h-7 px-2 align-middle whitespace-nowrap text-[11px]"
                >
                  {renderCellValue(item, column.id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
});

ExcelViewTable.displayName = 'ExcelViewTable';
