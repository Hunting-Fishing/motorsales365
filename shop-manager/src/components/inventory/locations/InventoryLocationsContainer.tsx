
import React from "react";
import { InventoryHeader } from "@/components/inventory/InventoryHeader";
import { InventoryLocationsPage } from "./InventoryLocationsPage";

export function InventoryLocationsContainer() {
  return (
    <div className="space-y-6">
      <InventoryHeader />
      <InventoryLocationsPage />
    </div>
  );
}
