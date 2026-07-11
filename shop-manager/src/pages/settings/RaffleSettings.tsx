import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { RaffleManagementTab } from "@/components/settings/RaffleManagementTab";

export const RaffleSettings = () => {
  return (
    <SettingsPageLayout 
      title="Raffle Management"
      description="Create and manage vehicle raffles and ticket sales"
    >
      <RaffleManagementTab />
    </SettingsPageLayout>
  );
};

export default RaffleSettings;
