
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { EmailSchedulingTab } from "@/components/settings/EmailSchedulingTab";

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
