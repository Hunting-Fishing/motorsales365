import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { BoardMeetingTab } from "@sm/components/settings/BoardMeetingTab";

export const BoardMeetingSettings = () => {
  return (
    <SettingsPageLayout 
      title="Board Meetings"
      description="Manage board meetings, agendas, and minutes"
    >
      <BoardMeetingTab />
    </SettingsPageLayout>
  );
};

export default BoardMeetingSettings;
