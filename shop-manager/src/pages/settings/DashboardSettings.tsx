import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { DashboardSettingsTab } from "@/components/settings/DashboardSettingsTab";

export const DashboardSettings = () => {
  return (
    <SettingsPageLayout 
      title="Dashboard Settings"
      description="Customize dashboard layout and widgets"
    >
      <DashboardSettingsTab />
    </SettingsPageLayout>
  );
};

export default DashboardSettings;
