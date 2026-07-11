
import { supabase } from "@/integrations/supabase/client";
import { LoyaltySettings } from "@/types/loyalty";

// Get loyalty settings for a shop
export const getLoyaltySettings = async (shopId: string): Promise<LoyaltySettings | null> => {
  const { data, error } = await supabase
    .from("loyalty_settings")
    .select("*")
    .eq("shop_id", shopId)
    .single();

  if (error) {
    console.error("Error fetching loyalty settings:", error);
    // If no settings found, create default settings
    if (error.code === 'PGRST116') {
      return createDefaultLoyaltySettings(shopId);
    }
    throw error;
  }

  return data;
};

// Create default loyalty settings
export const createDefaultLoyaltySettings = async (shopId: string): Promise<LoyaltySettings> => {
  const defaultSettings = {
    shop_id: shopId,
    is_enabled: false,
    points_per_dollar: 1.0,
    points_expiration_days: 365
  };

  const { data, error } = await supabase
    .from("loyalty_settings")
    .insert(defaultSettings)
    .select()
    .single();

  if (error) {
    console.error("Error creating default loyalty settings:", error);
    throw error;
  }

  return data;
};

// Update loyalty settings
export const updateLoyaltySettings = async (settings: Partial<LoyaltySettings>): Promise<LoyaltySettings> => {
  const { data, error } = await supabase
    .from("loyalty_settings")
    .update(settings)
    .eq("id", settings.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating loyalty settings:", error);
    throw error;
  }

  return data;
};

// Toggle loyalty program enabled status
export const toggleLoyaltyProgramEnabled = async (settingsId: string, isEnabled: boolean): Promise<LoyaltySettings> => {
  const { data, error } = await supabase
    .from("loyalty_settings")
    .update({ is_enabled: isEnabled })
    .eq("id", settingsId)
    .select()
    .single();

  if (error) {
    console.error("Error toggling loyalty program:", error);
    throw error;
  }

  return data;
};
