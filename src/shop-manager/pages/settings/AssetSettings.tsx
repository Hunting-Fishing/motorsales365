import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { AssetTrackingTab } from "@sm/components/settings/AssetTrackingTab";

export const AssetSettings = () => {
  return (
    <SettingsPageLayout 
      title="Asset Tracking"
      description="Track and manage organizational assets and equipment"
    >
      <AssetTrackingTab />
    </SettingsPageLayout>
  );
};

export default AssetSettings;
