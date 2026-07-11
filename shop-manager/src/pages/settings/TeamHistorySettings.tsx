
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { TeamHistoryTab } from "@/components/settings/TeamHistoryTab";

export const TeamHistorySettings = () => {
  return (
    <SettingsPageLayout 
      title="Team History"
      description="View team member activity logs"
    >
      <TeamHistoryTab />
    </SettingsPageLayout>
  );
};

export default TeamHistorySettings;
