
import { supabase } from "@/lib/supabase";
import { AppearanceSettings } from "@/types/settings";

export const appearanceService = {
  async getAppearanceSettings(shopId: string): Promise<AppearanceSettings | null> {
    try {
      const { data, error } = await supabase
        .from("appearance_settings")
        .select("*")
        .eq("shop_id", shopId)
        .single();

      if (error) {
        console.error("Error fetching appearance settings:", error);
        return null;
      }

      return {
        ...data,
        theme_mode: data.theme_mode as 'light' | 'dark' | 'auto'
      };
    } catch (error) {
      console.error("Failed to fetch appearance settings:", error);
      return null;
    }
  },

  async createAppearanceSettings(settings: Partial<AppearanceSettings>): Promise<AppearanceSettings | null> {
    try {
      const { data, error } = await supabase
        .from("appearance_settings")
        .insert(settings)
        .select()
        .single();

      if (error) {
        console.error("Error creating appearance settings:", error);
        return null;
      }

      return {
        ...data,
        theme_mode: data.theme_mode as 'light' | 'dark' | 'auto'
      };
    } catch (error) {
      console.error("Failed to create appearance settings:", error);
      return null;
    }
  },

  async updateAppearanceSettings(id: string, settings: Partial<AppearanceSettings>): Promise<AppearanceSettings | null> {
    try {
      const { data, error } = await supabase
        .from("appearance_settings")
        .update(settings)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating appearance settings:", error);
        return null;
      }

      return {
        ...data,
        theme_mode: data.theme_mode as 'light' | 'dark' | 'auto'
      };
    } catch (error) {
      console.error("Failed to update appearance settings:", error);
      return null;
    }
  }
};
