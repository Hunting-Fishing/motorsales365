import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { VolunteerManagementTab } from "@/components/settings/VolunteerManagementTab";

export const VolunteerSettings = () => {
  return (
    <SettingsPageLayout 
      title="Volunteer Management"
      description="Manage volunteers, skills tracking, and assignment workflows"
    >
      <VolunteerManagementTab />
    </SettingsPageLayout>
  );
};

export default VolunteerSettings;
