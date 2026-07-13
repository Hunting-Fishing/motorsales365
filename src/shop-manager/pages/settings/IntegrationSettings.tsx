
import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { IntegrationsTab } from "@sm/components/settings/IntegrationsTab";
import { useShopId } from "@sm/hooks/useShopId";

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
