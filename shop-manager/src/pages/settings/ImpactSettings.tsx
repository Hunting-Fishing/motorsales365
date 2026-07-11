import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { ImpactMeasurementTab } from "@/components/settings/ImpactMeasurementTab";

export const ImpactSettings = () => {
  return (
    <SettingsPageLayout 
      title="Impact Measurement"
      description="Track and measure your nonprofit's community impact"
    >
      <ImpactMeasurementTab />
    </SettingsPageLayout>
  );
};

export default ImpactSettings;
