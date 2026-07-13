import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { ImpactMeasurementTab } from "@sm/components/settings/ImpactMeasurementTab";

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
