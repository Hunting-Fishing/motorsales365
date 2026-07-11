
import React from "react";
import { InventoryHeader } from "@/components/inventory/InventoryHeader";
import { InventoryOrdersPage } from "./InventoryOrdersPage";

export function InventoryOrdersContainer() {
  return (
    <div className="space-y-6">
      <InventoryHeader />
      <InventoryOrdersPage />
    </div>
  );
}
