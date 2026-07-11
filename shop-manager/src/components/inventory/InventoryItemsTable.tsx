
import { InventoryItemExtended } from "@/types/inventory";
import { InventoryTable } from "./InventoryTable";
import { InventoryHeader } from "./InventoryHeader";

interface InventoryItemsTableProps {
  items: InventoryItemExtended[];
}

export function InventoryItemsTable({ items }: InventoryItemsTableProps) {
  return (
    <div className="space-y-6">
      <InventoryHeader />
      <div className="w-full">
        <InventoryTable items={items} />
      </div>
    </div>
  );
}
