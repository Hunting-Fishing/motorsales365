import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { ProgramManagementTab } from "@sm/components/settings/ProgramManagementTab";

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
