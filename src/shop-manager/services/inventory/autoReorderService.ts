
import { supabase } from "@/lib/supabase";
import { AutoReorderSettings } from "@/types/inventory";

// Get auto-reorder settings for all items
export async function getAutoReorderSettings(): Promise<Record<string, AutoReorderSettings>> {
  const { data, error } = await supabase
    .from("inventory_auto_reorder")
    .select("*");

  if (error) {
    console.error("Error fetching auto-reorder settings:", error);
    throw error;
  }

  const settings: Record<string, AutoReorderSettings> = {};
  (data || []).forEach(setting => {
    settings[setting.item_id] = {
      enabled: setting.enabled,
      threshold: setting.threshold,
      quantity: setting.quantity
    };
  });

  return settings;
}

// Enable auto-reorder for an item
export async function enableAutoReorder(itemId: string, threshold: number, quantity: number): Promise<void> {
  const { error } = await supabase
    .from("inventory_auto_reorder")
    .upsert({
      item_id: itemId,
      enabled: true,
      threshold,
      quantity
    });

  if (error) {
    console.error(`Error enabling auto-reorder for item ${itemId}:`, error);
    throw error;
  }
}

// Disable auto-reorder for an item
export async function disableAutoReorder(itemId: string): Promise<void> {
  const { error } = await supabase
    .from("inventory_auto_reorder")
    .update({ enabled: false })
    .eq("item_id", itemId);

  if (error) {
    console.error(`Error disabling auto-reorder for item ${itemId}:`, error);
    throw error;
  }
}
