
import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { InventorySettingsTab } from "@sm/components/settings/InventorySettingsTab";

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
