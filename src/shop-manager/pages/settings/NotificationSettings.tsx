
import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { NotificationsTab } from "@sm/components/settings/NotificationsTab";

export const NotificationSettings = () => {
  return (
    <SettingsPageLayout 
      title="Notifications"
      description="Configure email and system notifications"
    >
      <NotificationsTab />
    </SettingsPageLayout>
  );
};

export default NotificationSettings;
