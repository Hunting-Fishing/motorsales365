
import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { LanguageTab } from "@sm/components/settings/LanguageTab";

export const LanguageSettings = () => {
  return (
    <SettingsPageLayout 
      title="Language"
      description="Change your language settings"
    >
      <LanguageTab />
    </SettingsPageLayout>
  );
};

export default LanguageSettings;
