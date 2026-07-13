
import React from "react";
import { InventoryHeader } from "@/components/inventory/InventoryHeader";
import { InventoryCategoriesPage } from "./InventoryCategoriesPage";

export function InventoryCategoriesContainer() {
  return (
    <div className="space-y-6">
      <InventoryHeader />
      <InventoryCategoriesPage />
    </div>
  );
}
