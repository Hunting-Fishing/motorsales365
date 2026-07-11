
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsTabConfig } from '@/types/settingsConfig';

interface SettingsTabsListProps {
  tabs: SettingsTabConfig[];
  className?: string;
}

export const SettingsTabsList: React.FC<SettingsTabsListProps> = ({ 
  tabs, 
  className 
}) => {
  return (
    <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <TabsList className={`inline-flex h-11 items-center justify-start rounded-full bg-muted/60 p-1 text-muted-foreground min-w-max scroll-smooth ${className || ''}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              aria-label={tab.label}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border gap-2"
              title={tab.description}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
};
