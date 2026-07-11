
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { InventorySettingsTab } from "@/components/settings/InventorySettingsTab";

export const InventorySettings = () => {
  return (
    <SettingsPageLayout 
      title="Inventory Settings"
      description="Configure inventory preferences"
    >
      <InventorySettingsTab />
    </SettingsPageLayout>
  );
};

export default InventorySettings;
