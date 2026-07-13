
import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { AppearanceTab } from "@sm/components/settings/AppearanceTab";
import { useShopId } from "@sm/hooks/useShopId";

export const AppearanceSettings = () => {
  const { shopId } = useShopId();
  
  return (
    <SettingsPageLayout 
      title="Appearance"
      description="Customize the look and feel of your account"
    >
      <AppearanceTab shopId={shopId || undefined} />
    </SettingsPageLayout>
  );
};

export default AppearanceSettings;
