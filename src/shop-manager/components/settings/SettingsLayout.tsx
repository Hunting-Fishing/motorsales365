
import React from 'react';
import { SettingsPageLayout } from './SettingsPageLayout';
import { SettingsContainer } from './SettingsContainer';

export function SettingsLayout() {
  return (
    <SettingsPageLayout
      title="Settings"
      description="Manage your shop settings and preferences"
    >
      <SettingsContainer />
    </SettingsPageLayout>
  );
}
