
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import { useShopId } from "@/hooks/useShopId";

export const IntegrationSettings = () => {
  const { shopId } = useShopId();
  
  return (
    <SettingsPageLayout 
      title="Integrations"
      description="Connect with third-party services"
    >
      <IntegrationsTab shopId={shopId || undefined} />
    </SettingsPageLayout>
  );
};

export default IntegrationSettings;
