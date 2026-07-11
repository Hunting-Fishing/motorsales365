
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { SecurityTab } from "@/components/settings/SecurityTab";

export const SecuritySettings = () => {
  return (
    <SettingsPageLayout 
      title="Security"
      description="Password and authentication settings"
    >
      <SecurityTab />
    </SettingsPageLayout>
  );
};

export default SecuritySettings;
