import { useState, useEffect } from 'react';
import { dashboardSettingsService } from '@/services/settings/dashboardSettingsService';
import { useToast } from '@/hooks/use-toast';
import type { DashboardWidget, DashboardPreferences } from '@/services/settings/dashboardSettingsService';

// Re-export types for backward compatibility
export type { DashboardWidget, DashboardPreferences };

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'statsCards', name: 'Key Statistics', enabled: true, position: 0 },
  { id: 'revenueChart', name: 'Revenue Chart', enabled: true, position: 1 },
  { id: 'serviceDistribution', name: 'Service Distribution', enabled: true, position: 2 },
  { id: 'technicianPerformance', name: 'Technician Performance', enabled: true, position: 3 },
  { id: 'workOrderProgress', name: 'Work Order Progress', enabled: true, position: 4 },
  { id: 'todaySchedule', name: 'Today\'s Schedule', enabled: true, position: 5 },
  { id: 'equipmentRecommendations', name: 'Equipment Recommendations', enabled: true, position: 6 },
  { id: 'dashboardAlerts', name: 'Alerts & Notifications', enabled: true, position: 7 },
];

const DEFAULT_PREFERENCES: DashboardPreferences = {
  layout: 'detailed',
  refreshInterval: 30,
  widgets: DEFAULT_WIDGETS,
  defaultView: 'default',
};

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await dashboardSettingsService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
      // Keep default preferences on error
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<DashboardPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);

      await dashboardSettingsService.savePreferences(newPreferences);

      toast({
        title: 'Preferences saved',
        description: 'Your dashboard preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save dashboard preferences.',
        variant: 'destructive',
      });
      // Revert local state on error
      await loadPreferences();
    }
  };

  const toggleWidget = async (widgetId: string) => {
    try {
      await dashboardSettingsService.toggleWidget(widgetId);
      await loadPreferences(); // Refresh from service
    } catch (error) {
      console.error('Error toggling widget:', error);
      toast({
        title: 'Error',
        description: 'Failed to update widget settings.',
        variant: 'destructive',
      });
    }
  };

  const reorderWidgets = async (widgets: DashboardWidget[]) => {
    try {
      await dashboardSettingsService.reorderWidgets(widgets);
      await loadPreferences(); // Refresh from service
    } catch (error) {
      console.error('Error reordering widgets:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder widgets.',
        variant: 'destructive',
      });
    }
  };

  const getEnabledWidgets = () => {
    return preferences.widgets
      .filter(widget => widget.enabled)
      .sort((a, b) => a.position - b.position);
  };

  return {
    preferences,
    isLoading,
    savePreferences,
    toggleWidget,
    reorderWidgets,
    getEnabledWidgets,
  };
}