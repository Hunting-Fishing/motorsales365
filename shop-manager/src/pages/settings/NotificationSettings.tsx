
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { NotificationsTab } from "@/components/settings/NotificationsTab";

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
