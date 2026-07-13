import { supabase } from '@/integrations/supabase/client';
import { unifiedSettingsService } from '@/services/unified/unifiedSettingsService';

export interface DashboardWidget {
  id: string;
  name: string;
  enabled: boolean;
  position: number;
  [key: string]: any;
}

export interface DashboardPreferences {
  layout: 'compact' | 'detailed' | 'executive';
  refreshInterval: number; // in seconds
  widgets: DashboardWidget[];
  defaultView: 'default' | 'nonprofit';
}

class DashboardSettingsService {
  private readonly CATEGORY = 'dashboard';

  private async getShopId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (error || !profile?.shop_id) {
      throw new Error('Shop not found for user');
    }

    return profile.shop_id;
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
  }

  async getPreferences(): Promise<DashboardPreferences> {
    try {
      const [shopId, userId] = await Promise.all([
        this.getShopId(),
        this.getCurrentUserId()
      ]);

      // Try to get user-specific preferences from unified settings
      const userPreferences = await unifiedSettingsService.getSetting(
        shopId, 
        this.CATEGORY, 
        'user_preferences', 
        {}
      );

      // Check if this user has preferences
      const userPrefs = userPreferences[userId];
      if (userPrefs) {
        return { ...this.getDefaultPreferences(), ...userPrefs };
      }

      // Fall back to shop default configuration
      const defaultConfig = await unifiedSettingsService.getSetting(
        shopId,
        this.CATEGORY,
        'default_configuration',
        this.getDefaultPreferences()
      );

      return defaultConfig;
    } catch (error) {
      console.error('Error loading dashboard preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  async savePreferences(newPreferences: Partial<DashboardPreferences>): Promise<void> {
    try {
      const [shopId, userId] = await Promise.all([
        this.getShopId(),
        this.getCurrentUserId()
      ]);

      // Get current user preferences
      const currentUserPrefs = await unifiedSettingsService.getSetting(
        shopId,
        this.CATEGORY,
        'user_preferences',
        {}
      );

      // Get current user's existing preferences
      const currentPrefs = currentUserPrefs[userId] || this.getDefaultPreferences();
      
      // Merge with new preferences
      const updatedPrefs = { ...currentPrefs, ...newPreferences };

      // Update the user preferences object
      const updatedUserPrefs = {
        ...currentUserPrefs,
        [userId]: updatedPrefs
      };

      // Save back to unified settings
      await unifiedSettingsService.setSetting(
        shopId,
        this.CATEGORY,
        'user_preferences',
        updatedUserPrefs
      );

    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      throw new Error('Failed to save dashboard preferences');
    }
  }

  async getDefaultConfiguration(): Promise<DashboardPreferences> {
    try {
      const shopId = await this.getShopId();
      const defaultConfig = await unifiedSettingsService.getSetting(
        shopId,
        this.CATEGORY,
        'default_configuration',
        this.getDefaultPreferences()
      );
      return defaultConfig;
    } catch (error) {
      console.error('Error fetching default dashboard configuration:', error);
      return this.getDefaultPreferences();
    }
  }

  async updateDefaultConfiguration(config: Partial<DashboardPreferences>): Promise<void> {
    const shopId = await this.getShopId();
    const currentDefault = await this.getDefaultConfiguration();
    const updatedDefault = { ...currentDefault, ...config };
    
    await unifiedSettingsService.setSetting(
      shopId,
      this.CATEGORY,
      'default_configuration',
      updatedDefault
    );
  }

  toggleWidget = async (widgetId: string): Promise<void> => {
    const preferences = await this.getPreferences();
    const updatedWidgets = preferences.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
    );
    await this.savePreferences({ widgets: updatedWidgets });
  };

  reorderWidgets = async (widgets: DashboardWidget[]): Promise<void> => {
    const updatedWidgets = widgets.map((widget, index) => ({
      ...widget,
      position: index,
    }));
    await this.savePreferences({ widgets: updatedWidgets });
  };

  getEnabledWidgets = async (): Promise<DashboardWidget[]> => {
    const preferences = await this.getPreferences();
    return preferences.widgets
      .filter(widget => widget.enabled)
      .sort((a, b) => a.position - b.position);
  };

  private getDefaultPreferences(): DashboardPreferences {
    return {
      layout: 'detailed',
      refreshInterval: 30,
      widgets: [
        { id: 'statsCards', name: 'Key Statistics', enabled: true, position: 0 },
        { id: 'revenueChart', name: 'Revenue Chart', enabled: true, position: 1 },
        { id: 'serviceDistribution', name: 'Service Distribution', enabled: true, position: 2 },
        { id: 'technicianPerformance', name: 'Technician Performance', enabled: true, position: 3 },
        { id: 'workOrderProgress', name: 'Work Order Progress', enabled: true, position: 4 },
        { id: 'todaySchedule', name: 'Today\'s Schedule', enabled: true, position: 5 },
        { id: 'equipmentRecommendations', name: 'Equipment Recommendations', enabled: true, position: 6 },
        { id: 'dashboardAlerts', name: 'Alerts & Notifications', enabled: true, position: 7 },
      ],
      defaultView: 'default',
    };
  }
}

export const dashboardSettingsService = new DashboardSettingsService();