import React from 'react';
import { DashboardCustomization } from '@/components/dashboard/DashboardCustomization';

export const DashboardSettingsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard Settings</h2>
        <p className="text-muted-foreground">
          Customize your dashboard layout, widgets, and preferences
        </p>
      </div>
      
      <DashboardCustomization onClose={() => {}} />
    </div>
  );
};