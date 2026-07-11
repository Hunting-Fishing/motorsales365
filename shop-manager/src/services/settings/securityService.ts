
import { supabase } from "@/lib/supabase";
import { SecuritySettings } from "@/types/settings";

export const securityService = {
  async getSecuritySettings(shopId: string): Promise<SecuritySettings | null> {
    try {
      const { data, error } = await supabase
        .from("security_settings")
        .select("*")
        .eq("shop_id", shopId)
        .single();

      if (error) {
        console.error("Error fetching security settings:", error);
        return null;
      }

      return {
        ...data,
        password_policy: (typeof data.password_policy === 'string' 
          ? JSON.parse(data.password_policy) 
          : data.password_policy) as { min_length: number; require_numbers: boolean; require_special: boolean; }
      };
    } catch (error) {
      console.error("Failed to fetch security settings:", error);
      return null;
    }
  },

  async createSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings | null> {
    try {
      const { data, error } = await supabase
        .from("security_settings")
        .insert(settings)
        .select()
        .single();

      if (error) {
        console.error("Error creating security settings:", error);
        return null;
      }

      return {
        ...data,
        password_policy: (typeof data.password_policy === 'string' 
          ? JSON.parse(data.password_policy) 
          : data.password_policy) as { min_length: number; require_numbers: boolean; require_special: boolean; }
      };
    } catch (error) {
      console.error("Failed to create security settings:", error);
      return null;
    }
  },

  async updateSecuritySettings(id: string, settings: Partial<SecuritySettings>): Promise<SecuritySettings | null> {
    try {
      const { data, error } = await supabase
        .from("security_settings")
        .update(settings)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating security settings:", error);
        return null;
      }

      return {
        ...data,
        password_policy: (typeof data.password_policy === 'string' 
          ? JSON.parse(data.password_policy) 
          : data.password_policy) as { min_length: number; require_numbers: boolean; require_special: boolean; }
      };
    } catch (error) {
      console.error("Failed to update security settings:", error);
      return null;
    }
  }
};
