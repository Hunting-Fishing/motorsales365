
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { SecurityAdvancedTab } from "@/components/settings/SecurityAdvancedTab";
import { useShopId } from "@/hooks/useShopId";

export const SecurityAdvancedSettings = () => {
  const { shopId } = useShopId();
  
  return (
    <SettingsPageLayout 
      title="Advanced Security"
      description="2FA and security protocols"
    >
      <SecurityAdvancedTab shopId={shopId || undefined} />
    </SettingsPageLayout>
  );
};

export default SecurityAdvancedSettings;
