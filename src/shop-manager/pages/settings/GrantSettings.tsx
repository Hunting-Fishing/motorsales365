import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { GrantManagementTab } from "@/components/settings/GrantManagementTab";

export const GrantSettings = () => {
  return (
    <SettingsPageLayout 
      title="Grant Management"
      description="Track grant applications, deadlines, and reporting requirements"
    >
      <GrantManagementTab />
    </SettingsPageLayout>
  );
};

export default GrantSettings;
