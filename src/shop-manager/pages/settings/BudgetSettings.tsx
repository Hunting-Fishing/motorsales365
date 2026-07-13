import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { BudgetManagementTab } from "@sm/components/settings/BudgetManagementTab";

export const BudgetSettings = () => {
  return (
    <SettingsPageLayout 
      title="Budget Management"
      description="Track budgets, expenses, and financial performance"
    >
      <BudgetManagementTab />
    </SettingsPageLayout>
  );
};

export default BudgetSettings;
