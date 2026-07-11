
import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { DataExportTab } from "@/components/settings/DataExportTab";

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
