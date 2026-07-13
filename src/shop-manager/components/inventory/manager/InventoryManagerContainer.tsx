
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { InventoryFieldManager } from "./InventoryFieldManager";

export function InventoryManagerContainer() {
  return (
    <SettingsPageLayout
      title="Inventory Field Manager"
      description="Configure which inventory fields are mandatory or optional for your organization"
    >
      <InventoryFieldManager />
    </SettingsPageLayout>
  );
}
