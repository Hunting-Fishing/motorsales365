
import React from "react";
import { SettingsPageLayout } from "@sm/components/settings/SettingsPageLayout";
import { DataExportTab } from "@sm/components/settings/DataExportTab";

export const DataExportSettings = () => {
  return (
    <SettingsPageLayout 
      title="Data Export"
      description="Export your shop data"
    >
      <DataExportTab />
    </SettingsPageLayout>
  );
};

export default DataExportSettings;
