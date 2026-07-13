
import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { InventoryMarkupTab } from "@sm/components/settings/InventoryMarkupTab";

export const MarkupSettings = () => {
  return (
    <SettingsPageLayout 
      title="Inventory Markup"
      description="Configure markup percentages for parts based on cost ranges and suppliers"
    >
      <InventoryMarkupTab />
    </SettingsPageLayout>
  );
};

export default MarkupSettings;
