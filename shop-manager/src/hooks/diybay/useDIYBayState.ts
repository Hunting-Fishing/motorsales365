
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useShopId } from "@/hooks/useShopId";
import { useToast } from "@/hooks/use-toast";
import { Bay, RateSettings } from "@/services/diybay/diybayService";

export function useDIYBayState() {
  const [bays, setBays] = useState<Bay[]>([]);
  const [settings, setSettings] = useState<RateSettings>({
    daily_hours: 8,
    daily_discount_percent: 25,
    weekly_multiplier: 20,
    monthly_multiplier: 40,
    hourly_base_rate: 65 // Default hourly base rate
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { shopId, loading: shopIdLoading } = useShopId();
  const { toast } = useToast();

  const loadData = async () => {
    if (!shopId) {
      console.log("No shop ID available yet");
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Loading data with shop ID:", shopId);
      // Fetch bays data - now ordering by display_order
      const { data: baysData, error: baysError } = await supabase
        .from('diy_bay_rates')
        .select('*')
        .eq('shop_id', shopId)
        .order('display_order', { ascending: true });
        
      if (baysError) throw baysError;
      
      // Fetch settings data
      const { data: settingsData, error: settingsError } = await supabase
        .from('diy_bay_rate_settings')
        .select('*')
        .eq('shop_id', shopId)
        .single();
        
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      // Update state with fetched data, mapping database fields to Bay interface
      if (baysData) {
        console.log("Loaded bays data:", baysData);
        const mappedBays: Bay[] = baysData.map(dbBay => ({
          ...dbBay,
          // Ensure backward compatibility with legacy fields
          name: dbBay.bay_name,
          description: dbBay.bay_location,
          bay_number: dbBay.display_order || 0,
          bay_type: 'standard',
          features: null
        }));
        setBays(mappedBays);
      } else {
        console.log("No bays data found");
      }
      
      if (settingsData) {
        console.log("Loaded settings data:", settingsData);
        setSettings({
          id: settingsData.id,
          daily_hours: settingsData.daily_hours,
          daily_discount_percent: settingsData.daily_discount_percent,
          weekly_multiplier: settingsData.weekly_multiplier,
          monthly_multiplier: settingsData.monthly_multiplier,
          hourly_base_rate: settingsData.hourly_base_rate || 65 // Use default if not set
        });
      } else {
        console.log("No settings data found, creating default");
        // Create default settings if none exist
        await createDefaultSettings();
      }
      
    } catch (error: any) {
      console.error("Error loading DIY bay data:", error);
      toast({
        title: "Error",
        description: "Failed to load DIY bay data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const createDefaultSettings = async () => {
    if (!shopId) {
      console.error("Cannot create default settings: No shop ID available");
      return;
    }
    
    try {
      console.log("Creating default settings for shop ID:", shopId);
      const { data, error } = await supabase
        .from('diy_bay_rate_settings')
        .insert({
          shop_id: shopId,
          daily_hours: 8,
          daily_discount_percent: 25,
          weekly_multiplier: 20,
          monthly_multiplier: 40,
          hourly_base_rate: 65 // Default hourly base rate
        })
        .select('*')
        .single();
        
      if (error) throw error;
      
      if (data) {
        console.log("Created default settings:", data);
        setSettings({
          id: data.id,
          daily_hours: data.daily_hours,
          daily_discount_percent: data.daily_discount_percent,
          weekly_multiplier: data.weekly_multiplier,
          monthly_multiplier: data.monthly_multiplier,
          hourly_base_rate: data.hourly_base_rate
        });
      }
      
    } catch (error) {
      console.error("Error creating default settings:", error);
    }
  };

  useEffect(() => {
    if (shopId && !shopIdLoading) {
      console.log("Shop ID loaded, fetching data:", shopId);
      loadData();
    } else if (shopIdLoading) {
      console.log("Waiting for shop ID to load...");
    } else {
      console.log("No shop ID available");
      setIsLoading(false); // No need to keep loading if there's no shop ID
    }
  }, [shopId, shopIdLoading]);

  return {
    bays,
    setBays,
    settings,
    setSettings,
    isLoading,
    isSaving,
    setIsSaving,
    loadData
  };
}
