
import { supabase } from "@/lib/supabase";
import { Bay, RateSettings, calculateRates } from "@/services/diybay/diybayService";
import { useToast } from "@/hooks/use-toast";
import { useShopId } from "@/hooks/useShopId";

export function useRateSettings(
  settings: RateSettings,
  setSettings: React.Dispatch<React.SetStateAction<RateSettings>>,
  bays: Bay[],
  setBays: React.Dispatch<React.SetStateAction<Bay[]>>,
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>
) {
  const { toast } = useToast();
  const { shopId } = useShopId();

  const updateBayRateSettings = async (newSettings: RateSettings): Promise<boolean> => {
    if (!shopId) {
      toast({
        title: "Error",
        description: "Unable to save settings: No shop ID found. Please refresh the page or contact support.",
        variant: "destructive"
      });
      return false;
    }
    
    if (!settings.id) {
      toast({
        title: "Error",
        description: "Settings ID is missing. Please refresh the page or contact support.",
        variant: "destructive"
      });
      return false;
    }
    
    setIsSaving(true);
    
    try {
      // Deep compare to ensure we have actual changes
      const hasChanges = JSON.stringify(newSettings) !== JSON.stringify(settings);
      
      if (!hasChanges) {
        toast({
          title: "Info",
          description: "No changes to save"
        });
        return true;
      }
      
      // Prepare data for update - ensure all values are numbers
      const updateData = {
        daily_hours: Number(newSettings.daily_hours),
        daily_discount_percent: Number(newSettings.daily_discount_percent),
        weekly_multiplier: Number(newSettings.weekly_multiplier),
        monthly_multiplier: Number(newSettings.monthly_multiplier),
        hourly_base_rate: Number(newSettings.hourly_base_rate)
      };
      
      // Update settings in database
      const { error } = await supabase
        .from('diy_bay_rate_settings')
        .update(updateData)
        .eq('id', settings.id);
        
      if (error) throw error;
      
      // Update local settings state
      setSettings(prev => ({
        ...prev,
        ...updateData
      }));
      
      // Recalculate rates for all bays using new settings
      const normalizedSettings: RateSettings = {
        ...settings,
        ...updateData
      };
      
      const updatedBays = bays.map(bay => {
        if (!bay.hourly_rate) return bay;
        
        const calculatedRates = calculateRates(bay.hourly_rate, normalizedSettings);
        
        return {
          ...bay,
          daily_rate: calculatedRates.daily,
          weekly_rate: calculatedRates.weekly,
          monthly_rate: calculatedRates.monthly
        };
      });
      
      // Update bays in database with new calculated rates
      for (const bay of updatedBays) {
        await supabase
          .from('diy_bay_rates')
          .update({
            daily_rate: bay.daily_rate,
            weekly_rate: bay.weekly_rate,
            monthly_rate: bay.monthly_rate
          })
          .eq('id', bay.id);
      }
      
      // Update local bays state
      setBays(updatedBays);
      
      toast({
        title: "Settings saved",
        description: "Rate settings have been updated successfully."
      });
      
      return true;
    } catch (error: any) {
      console.error("Error updating rate settings:", error);
      toast({
        title: "Error",
        description: `Failed to update rate settings: ${error.message}`,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { updateBayRateSettings };
}
