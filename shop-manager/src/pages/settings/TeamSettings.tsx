import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { TeamTab } from "@/components/settings/TeamTab";

export const TeamSettings = () => {
  return (
    <SettingsPageLayout 
      title="Team Settings"
      description="Manage team members and permissions"
    >
      <TeamTab />
    </SettingsPageLayout>
  );
};

export default TeamSettings;
