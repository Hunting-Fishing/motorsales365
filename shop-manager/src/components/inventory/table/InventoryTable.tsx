
import React, { useEffect } from "react";
import { Table } from "@/components/ui/table";
import { InventoryItemExtended } from "@/types/inventory";
import { useNavigate } from "react-router-dom";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TableHeader } from "./TableHeader";
import { TableBody } from "./TableBody";
import { useColumnDragDrop } from "./useColumnDragDrop";
import { Column } from "./SortableColumnHeader";

interface InventoryTableProps {
  items: InventoryItemExtended[];
}

export const InventoryTable = ({ items }: InventoryTableProps) => {
  const navigate = useNavigate();
  const initialColumns: Column[] = [
    { id: "partNumber", name: "partNumber", label: "Part #", visible: true },
    { id: "name", name: "name", label: "Item Name", visible: true },
    { id: "sku", name: "sku", label: "SKU", visible: true },
    { id: "barcode", name: "barcode", label: "Barcode", visible: true },
    { id: "category", name: "category", label: "Category", visible: true },
    { id: "subcategory", name: "subcategory", label: "Subcategory", visible: true },
    { id: "manufacturer", name: "manufacturer", label: "Brand/Manufacturer", visible: true },
    { id: "vehicleCompatibility", name: "vehicleCompatibility", label: "Vehicle Compatibility", visible: true },
    { id: "location", name: "location", label: "Location", visible: true },
    { id: "quantity", name: "quantity", label: "Quantity In Stock", visible: true },
    { id: "quantityReserved", name: "quantityReserved", label: "Quantity Reserved", visible: false },
    { id: "quantityAvailable", name: "quantityAvailable", label: "Quantity Available", visible: false },
    { id: "onOrder", name: "onOrder", label: "Qty on Order", visible: true },
    { id: "reorderPoint", name: "reorderPoint", label: "Reorder Level", visible: true },
    { id: "cost", name: "cost", label: "Unit Cost", visible: true },
    { id: "unitPrice", name: "unitPrice", label: "Unit Price", visible: true },
    { id: "marginMarkup", name: "marginMarkup", label: "Markup % / Margin", visible: false },
    { id: "totalValue", name: "totalValue", label: "Total Value", visible: false },
    { id: "warrantyPeriod", name: "warrantyPeriod", label: "Warranty Period", visible: true },
    { id: "status", name: "status", label: "Status", visible: true },
    { id: "supplier", name: "supplier", label: "Supplier", visible: true },
    { id: "dateBought", name: "dateBought", label: "Last Ordered Date", visible: false },
    { id: "dateLast", name: "dateLast", label: "Last Used On", visible: false },
    { id: "notes", name: "notes", label: "Notes", visible: false },
  ];

  const { columns, setColumns, handleDragEnd } = useColumnDragDrop(initialColumns);
  
  // Load saved columns from localStorage
  useEffect(() => {
    const savedColumns = localStorage.getItem("inventoryTableColumns");
    if (savedColumns) {
      setColumns(JSON.parse(savedColumns));
    }
  }, [setColumns]);

  // Save columns to localStorage when they change
  useEffect(() => {
    localStorage.setItem("inventoryTableColumns", JSON.stringify(columns));
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleRowClick = (itemId: string) => {
    navigate(`/inventory/item/${itemId}`);
  };

  const visibleColumns = columns.filter((col) => col.visible);

  return (
    <div className="w-full overflow-auto border rounded-md">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToHorizontalAxis]}
      >
        <Table>
          <TableHeader columns={columns} setColumns={setColumns} />
          <TableBody 
            items={items} 
            visibleColumns={visibleColumns} 
            onRowClick={handleRowClick} 
          />
        </Table>
      </DndContext>
    </div>
  );
};
