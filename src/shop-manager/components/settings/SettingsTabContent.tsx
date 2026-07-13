
import React from 'react';
import { TabsContent } from '@sm/components/ui/tabs';
import { SettingsTabConfig } from '@sm/types/settingsConfig';

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
