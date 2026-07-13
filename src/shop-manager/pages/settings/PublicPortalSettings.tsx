import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { PublicPortalTab } from "@sm/components/settings/PublicPortalTab";

export const PublicPortalSettings = () => {
  return (
    <SettingsPageLayout 
      title="Public Portal"
      description="Manage public-facing portal and application forms"
    >
      <PublicPortalTab />
    </SettingsPageLayout>
  );
};

export default PublicPortalSettings;
