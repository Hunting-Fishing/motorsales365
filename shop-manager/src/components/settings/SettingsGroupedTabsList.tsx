import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SettingsSection } from '@/types/settingsConfig';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface SettingsGroupedTabsListProps {
  sections: SettingsSection[];
  className?: string;
  searchQuery?: string;
}

// Helper function to highlight search matches
const highlightMatch = (text: string, searchQuery?: string) => {
  if (!searchQuery || !text) return text;
  
  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100">
        {part}
      </mark>
    ) : part
  );
};

export const SettingsGroupedTabsList: React.FC<SettingsGroupedTabsListProps> = ({ 
  sections, 
  className,
  searchQuery 
}) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Get section IDs that contain the active tab to default open
  const getDefaultOpenSections = () => {
    const openSections: string[] = [];
    sections.forEach(section => {
      const hasActiveTab = section.tabs.some(tab => {
        const tabPath = tab.path || `/settings/${tab.id}`;
        return currentPath === tabPath || currentPath.startsWith(tabPath + '/');
      });
      if (hasActiveTab) {
        openSections.push(section.id);
      }
    });
    // If no active tab found or on main settings page, open all sections
    if (openSections.length === 0 || currentPath === '/settings' || currentPath === '/settings/') {
      return sections.map(s => s.id);
    }
    return openSections;
  };

  return (
    <div className={cn("w-full", className)}>
      <Accordion 
        type="multiple" 
        defaultValue={getDefaultOpenSections()}
        className="w-full space-y-3"
      >
        {sections.map((section) => (
          <AccordionItem 
            key={section.id} 
            value={section.id}
            className="border border-border/50 rounded-lg bg-card/30 overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-180">
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold text-foreground">
                  {section.title}
                </span>
                {section.description && (
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {section.description}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 px-3">
                {section.tabs.map((tab) => {
                  const Icon = tab.icon;
                  const tabPath = tab.path || `/settings/${tab.id}`;
                  const isActive = currentPath === tabPath || currentPath.startsWith(tabPath + '/');
                  
                  return (
                    <Link
                      key={tab.id}
                      to={tabPath}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 h-auto text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 gap-2 rounded-lg border",
                        isActive 
                          ? "bg-primary/10 border-primary text-primary shadow-sm" 
                          : "border-border hover:bg-muted hover:border-primary/50 hover:shadow-sm"
                      )}
                      title={tab.description}
                    >
                      <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                      <span className="text-center leading-tight">
                        {highlightMatch(tab.label, searchQuery)}
                      </span>
                      {searchQuery && tab.description && (
                        <span className="text-xs text-muted-foreground text-center leading-tight">
                          {highlightMatch(tab.description, searchQuery)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
