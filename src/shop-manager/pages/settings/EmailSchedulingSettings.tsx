
import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { EmailSchedulingTab } from "@sm/components/settings/EmailSchedulingTab";

export const EmailSchedulingSettings = () => {
  return (
    <SettingsPageLayout 
      title="Email Scheduling"
      description="Set up automated email campaigns"
    >
      <EmailSchedulingTab />
    </SettingsPageLayout>
  );
};

export default EmailSchedulingSettings;
