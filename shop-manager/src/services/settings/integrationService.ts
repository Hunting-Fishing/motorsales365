
import { supabase } from "@/lib/supabase";
import { IntegrationSettings } from "@/types/settings";

export const integrationService = {
  async getIntegrationSettings(shopId: string, type?: string): Promise<IntegrationSettings[]> {
    try {
      let query = supabase
        .from("integration_settings")
        .select("*")
        .eq("shop_id", shopId);
        
      if (type) {
        query = query.eq("integration_type", type);
      }
        
      const { data, error } = await query;

      if (error) {
        console.error("Error fetching integration settings:", error);
        return [];
      }

      return (data || []).map(item => ({
        ...item,
        integration_type: item.integration_type as 'sms' | 'payment' | 'calendar' | 'analytics' | 'crm' | 'other',
        config: (typeof item.config === 'string' ? JSON.parse(item.config) : item.config) as Record<string, any> || {}
      }));
    } catch (error) {
      console.error("Failed to fetch integration settings:", error);
      return [];
    }
  },

  async createIntegrationSetting(settings: Partial<IntegrationSettings>): Promise<IntegrationSettings | null> {
    try {
      // Ensure required fields are present
      const completeSettings = {
        integration_type: settings.integration_type || 'other',
        shop_id: settings.shop_id,
        is_enabled: settings.is_enabled ?? false,
        config: settings.config || {}
      };

      const { data, error } = await supabase
        .from("integration_settings")
        .insert(completeSettings)
        .select()
        .single();

      if (error) {
        console.error("Error creating integration setting:", error);
        return null;
      }

      return {
        ...data,
        integration_type: data.integration_type as 'sms' | 'payment' | 'calendar' | 'analytics' | 'crm' | 'other',
        config: (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) as Record<string, any> || {}
      };
    } catch (error) {
      console.error("Failed to create integration setting:", error);
      return null;
    }
  },

  async updateIntegrationSetting(id: string, settings: Partial<IntegrationSettings>): Promise<IntegrationSettings | null> {
    try {
      const { data, error } = await supabase
        .from("integration_settings")
        .update(settings)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating integration setting:", error);
        return null;
      }

      return {
        ...data,
        integration_type: data.integration_type as 'sms' | 'payment' | 'calendar' | 'analytics' | 'crm' | 'other',
        config: (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) as Record<string, any> || {}
      };
    } catch (error) {
      console.error("Failed to update integration setting:", error);
      return null;
    }
  },

  async deleteIntegrationSetting(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("integration_settings")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting integration setting:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to delete integration setting:", error);
      return false;
    }
  }
};
