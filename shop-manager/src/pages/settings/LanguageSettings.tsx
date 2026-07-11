
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { LanguageTab } from "@/components/settings/LanguageTab";

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
