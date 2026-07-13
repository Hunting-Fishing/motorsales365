import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { TeamTab } from "@sm/components/settings/TeamTab";

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
