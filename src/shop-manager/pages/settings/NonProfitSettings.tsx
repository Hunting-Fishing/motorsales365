import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { NonProfitTab } from "@sm/components/settings/NonProfitTab";

export const NonProfitSettings = () => {
  return (
    <SettingsPageLayout 
      title="Non-Profit Settings"
      description="Manage non-profit specific features and settings"
    >
      <NonProfitTab />
    </SettingsPageLayout>
  );
};

export default NonProfitSettings;
