import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { GrantManagementTab } from "@sm/components/settings/GrantManagementTab";

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
