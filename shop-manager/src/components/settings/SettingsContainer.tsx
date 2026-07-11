
import React, { useMemo } from 'react';
import { SettingsGroupedTabsList } from './SettingsGroupedTabsList';
import { SearchInput } from './SearchInput';
import { SETTINGS_SECTIONS } from '@/config/settingsConfig';
import { useSettingsSearch } from '@/hooks/useSettingsSearch';
import { useUserRoles } from '@/hooks/useUserRoles';
import { SettingsSection } from '@/types/settingsConfig';

interface SettingsContainerProps {
  className?: string;
}

export const SettingsContainer: React.FC<SettingsContainerProps> = ({ 
  className 
}) => {
  const { data: userRoles = [] } = useUserRoles();
  
  // Filter sections based on user roles
  const accessibleSections = useMemo(() => {
    return SETTINGS_SECTIONS.map(section => ({
      ...section,
      tabs: section.tabs.filter(tab => {
        // If no required roles specified, tab is accessible to all
        if (!tab.requiredRoles || tab.requiredRoles.length === 0) {
          return true;
        }
        
        // Check if user has at least one of the required roles
        return tab.requiredRoles.some(role => userRoles.includes(role));
      })
    })).filter(section => section.tabs.length > 0); // Remove empty sections
  }, [userRoles]);
  
  const { 
    searchQuery, 
    setSearchQuery, 
    filteredSections, 
    isSearching,
    hasResults 
  } = useSettingsSearch(accessibleSections);

  return (
    <div className={`w-full ${className || ''}`}>
      <div className="mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search settings..."
          className="w-full max-w-md"
        />
        {isSearching && (
          <p className="text-sm text-muted-foreground mt-2" role="status" aria-live="polite" aria-atomic="true">
            {hasResults 
              ? `Found ${filteredSections.reduce((acc, section) => acc + section.tabs.length, 0)} settings`
              : 'No settings found matching your search'
            }
          </p>
        )}
      </div>
      
      <SettingsGroupedTabsList 
        sections={isSearching ? filteredSections : accessibleSections}
        searchQuery={searchQuery}
      />
    </div>
  );
};
