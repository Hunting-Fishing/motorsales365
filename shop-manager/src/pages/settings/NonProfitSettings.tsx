import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { NonProfitTab } from "@/components/settings/NonProfitTab";

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
