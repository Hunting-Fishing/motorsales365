
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useShopId } from "@/hooks/useShopId";
import { useToast } from "@/hooks/use-toast";

export interface LabourRates {
  id?: string;
  shop_id?: string;
  standard_rate: number | string;
  diagnostic_rate: number | string;
  emergency_rate: number | string;
  warranty_rate: number | string;
  internal_rate: number | string;
}

export function useLabourRates() {
  const [rates, setRates] = useState<LabourRates>({
    standard_rate: 125,
    diagnostic_rate: 145,
    emergency_rate: 175,
    warranty_rate: 95,
    internal_rate: 85
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { shopId } = useShopId();
  const { toast } = useToast();

  // Fetch rates from Supabase when component mounts
  useEffect(() => {
    async function fetchRates() {
      if (!shopId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('labor_rates')
          .select('*')
          .eq('shop_id', shopId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No record found, create a default one
            await createDefaultRates();
          } else {
            console.error("Error fetching labor rates:", error);
            toast({
              title: "Error",
              description: "Failed to fetch labor rates. Please try again.",
              variant: "destructive",
            });
          }
        } else if (data) {
          setRates({
            id: data.id,
            shop_id: data.shop_id,
            standard_rate: data.standard_rate,
            diagnostic_rate: data.diagnostic_rate,
            emergency_rate: data.emergency_rate,
            warranty_rate: data.warranty_rate,
            internal_rate: data.internal_rate
          });
        }
      } catch (error) {
        console.error("Unexpected error fetching labor rates:", error);
      } finally {
        setLoading(false);
      }
    }

    async function createDefaultRates() {
      try {
        const defaultRates = {
          shop_id: shopId,
          standard_rate: 125,
          diagnostic_rate: 145,
          emergency_rate: 175,
          warranty_rate: 95,
          internal_rate: 85
        };

        const { data, error } = await supabase
          .from('labor_rates')
          .insert(defaultRates)
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setRates({
            id: data.id,
            shop_id: data.shop_id,
            standard_rate: data.standard_rate,
            diagnostic_rate: data.diagnostic_rate,
            emergency_rate: data.emergency_rate,
            warranty_rate: data.warranty_rate,
            internal_rate: data.internal_rate
          });
        }
      } catch (error) {
        console.error("Error creating default labor rates:", error);
        toast({
          title: "Error",
          description: "Failed to create default labor rates. Please try again.",
          variant: "destructive",
        });
      }
    }

    if (shopId) {
      fetchRates();
    }
  }, [shopId, toast]);

  const handleInputChange = (field: keyof LabourRates, value: string) => {
    // Allow empty string as a valid input
    if (value === '') {
      setRates(prev => ({
        ...prev,
        [field]: ''
      }));
      setHasChanges(true);
      return;
    }

    // Only update if it's a valid number
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      setRates(prev => ({
        ...prev,
        [field]: numericValue
      }));
      setHasChanges(true);
    }
  };

  const saveRates = async () => {
    if (!shopId) return;
    
    setSaving(true);
    
    try {
      // Convert any empty strings to 0 and ensure all values are numbers before saving
      const ratesToSave = {
        standard_rate: typeof rates.standard_rate === 'string' ? (parseFloat(rates.standard_rate) || 0) : rates.standard_rate,
        diagnostic_rate: typeof rates.diagnostic_rate === 'string' ? (parseFloat(rates.diagnostic_rate) || 0) : rates.diagnostic_rate,
        emergency_rate: typeof rates.emergency_rate === 'string' ? (parseFloat(rates.emergency_rate) || 0) : rates.emergency_rate,
        warranty_rate: typeof rates.warranty_rate === 'string' ? (parseFloat(rates.warranty_rate) || 0) : rates.warranty_rate,
        internal_rate: typeof rates.internal_rate === 'string' ? (parseFloat(rates.internal_rate) || 0) : rates.internal_rate
      };
      
      const { error } = await supabase
        .from('labor_rates')
        .update(ratesToSave)
        .eq('shop_id', shopId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Labour rates have been updated successfully.",
        variant: "default",
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving labor rates:", error);
      toast({
        title: "Error",
        description: "Failed to update labour rates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    rates,
    loading,
    saving,
    hasChanges,
    handleInputChange,
    saveRates
  };
}
