import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { ComplianceTab } from "@/components/settings/ComplianceTab";

export const ComplianceSettings = () => {
  return (
    <SettingsPageLayout 
      title="Compliance"
      description="Track regulatory compliance requirements and deadlines"
    >
      <ComplianceTab />
    </SettingsPageLayout>
  );
};

export default ComplianceSettings;
