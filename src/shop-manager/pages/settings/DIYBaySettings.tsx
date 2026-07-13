import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { DIYBayRatesTab } from "@sm/components/settings/DIYBayRatesTab";

export const DIYBaySettings = () => {
  return (
    <SettingsPageLayout 
      title="DIY Bay Rates"
      description="Set rates for DIY bay rentals"
    >
      <DIYBayRatesTab />
    </SettingsPageLayout>
  );
};

export default DIYBaySettings;
