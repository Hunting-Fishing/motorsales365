
import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SETTINGS_TABS, SETTINGS_SECTIONS, DEFAULT_SETTINGS_TAB } from '@/config/settingsConfig';

export interface UseSettingsNavigationResult {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: typeof SETTINGS_TABS;
  sections: typeof SETTINGS_SECTIONS;
  currentTab: typeof SETTINGS_TABS[0] | undefined;
  isValidTab: (tab: string) => boolean;
}

export const useSettingsNavigation = (initialTab?: string): UseSettingsNavigationResult => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract tab from URL path (e.g., "/settings/security" -> "security")
  const getTabFromPath = useCallback(() => {
    const pathParts = location.pathname.split('/');
    const tabFromPath = pathParts[2]; // /settings/[tab]
    return tabFromPath && SETTINGS_TABS.some(t => t.id === tabFromPath) ? tabFromPath : DEFAULT_SETTINGS_TAB;
  }, [location.pathname]);

  const [activeTab, setActiveTabState] = useState(
    initialTab || getTabFromPath()
  );

  // Sync tab with URL changes
  useEffect(() => {
    const tabFromPath = getTabFromPath();
    if (tabFromPath !== activeTab) {
      setActiveTabState(tabFromPath);
    }
  }, [location.pathname, activeTab, getTabFromPath]);

  const isValidTab = useCallback((tab: string): boolean => {
    return SETTINGS_TABS.some(t => t.id === tab);
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    if (isValidTab(tab)) {
      setActiveTabState(tab);
      // Update URL to match selected tab
      navigate(`/settings/${tab}`, { replace: true });
    }
  }, [isValidTab, navigate]);

  const currentTab = SETTINGS_TABS.find(tab => tab.id === activeTab);

  return {
    activeTab,
    setActiveTab,
    tabs: SETTINGS_TABS,
    sections: SETTINGS_SECTIONS,
    currentTab,
    isValidTab
  };
};
