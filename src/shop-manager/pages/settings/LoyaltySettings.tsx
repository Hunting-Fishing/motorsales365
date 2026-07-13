
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { LoyaltyTab } from "@/components/settings/LoyaltyTab";

export const LoyaltySettings = () => {
  return (
    <SettingsPageLayout 
      title="Customer Loyalty"
      description="Set up your loyalty program"
    >
      <LoyaltyTab />
    </SettingsPageLayout>
  );
};

export default LoyaltySettings;
