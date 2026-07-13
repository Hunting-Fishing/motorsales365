
import React from "react";
import { InventoryHeader } from "@/components/inventory/InventoryHeader";
import { InventorySuppliersPage } from "./InventorySuppliersPage";

export function InventorySuppliersContainer() {
  return (
    <div className="space-y-6">
      <InventoryHeader />
      <InventorySuppliersPage />
    </div>
  );
}
