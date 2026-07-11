
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { EmailSettingsTab } from "@/components/settings/EmailSettingsTab";
import { useShopId } from "@/hooks/useShopId";

export const EmailSettings = () => {
  const { shopId } = useShopId();
  
  return (
    <SettingsPageLayout 
      title="Email Settings"
      description="Configure email templates and signatures"
    >
      <EmailSettingsTab shopId={shopId || undefined} />
    </SettingsPageLayout>
  );
};

export default EmailSettings;
