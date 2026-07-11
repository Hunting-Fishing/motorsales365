
import React, { useEffect } from "react";
import { SettingsPageLayout } from "@/components/settings/SettingsPageLayout";
import { AccountTab } from "@/components/settings/AccountTab";
import { useLocation } from "react-router-dom";

export const AccountSettings = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');

  return (
    <SettingsPageLayout 
      title="Account Settings"
      description="Manage your profile, company and branding preferences"
      defaultTab={tabParam || "profile"}
    >
      <AccountTab />
    </SettingsPageLayout>
  );
};

export default AccountSettings;
