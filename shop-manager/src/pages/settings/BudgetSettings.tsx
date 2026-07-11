import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { BudgetManagementTab } from "@/components/settings/BudgetManagementTab";

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
