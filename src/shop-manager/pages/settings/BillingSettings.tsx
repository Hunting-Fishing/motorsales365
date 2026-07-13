import React from 'react';
import { SettingsPageLayout } from '@sm/components/settings/SettingsPageLayout';
import { BillingTab } from '@sm/components/billing/BillingTab';

export default function BillingSettings() {
  return (
    <SettingsPageLayout
      title="Billing & Subscription"
      description="Manage your subscription plan and billing details"
    >
      <BillingTab />
    </SettingsPageLayout>
  );
}
