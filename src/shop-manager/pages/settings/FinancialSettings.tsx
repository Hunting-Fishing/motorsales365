import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { FinancialManagementTab } from "@sm/components/settings/FinancialManagementTab";

export const FinancialSettings = () => {
  return (
    <SettingsPageLayout 
      title="Financial Management"
      description="Budget tracking, financial reporting, and compliance management"
    >
      <FinancialManagementTab />
    </SettingsPageLayout>
  );
};

export default FinancialSettings;
