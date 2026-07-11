import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { ProgramManagementTab } from "@/components/settings/ProgramManagementTab";

export const ProgramSettings = () => {
  return (
    <SettingsPageLayout 
      title="Program Management"
      description="Manage programs, volunteers, grants, and impact measurement"
    >
      <ProgramManagementTab />
    </SettingsPageLayout>
  );
};

export default ProgramSettings;
