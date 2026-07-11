import React from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { WorkOrderManagementTab } from "@/components/settings/WorkOrderManagementTab";

export const WorkOrdersSettings = () => {
  return (
    <SettingsPageLayout 
      title="Work Order Settings"
      description="Comprehensive work order settings, workflows, and automation"
    >
      <WorkOrderManagementTab />
    </SettingsPageLayout>
  );
};

export default WorkOrdersSettings;
