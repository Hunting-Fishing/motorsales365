import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { PublicPortalTab } from "@/components/settings/PublicPortalTab";

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
