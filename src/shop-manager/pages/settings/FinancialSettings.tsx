import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { FinancialManagementTab } from "@/components/settings/FinancialManagementTab";

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
