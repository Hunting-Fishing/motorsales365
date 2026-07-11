
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { SettingsTabConfig } from '@/types/settingsConfig';

interface SettingsTabContentProps {
  tabs: SettingsTabConfig[];
}

export const SettingsTabContent: React.FC<SettingsTabContentProps> = ({ tabs }) => {
  return (
    <>
      {tabs.map((tab) => {
        const Component = tab.component;
        return (
          <TabsContent key={tab.id} value={tab.id}>
            <Component />
          </TabsContent>
        );
      })}
    </>
  );
};
