import { useState, useEffect } from 'react';
import { taxSettingsService, type TaxSettings } from '@/services/settings/taxSettingsService';
import { useToast } from '@/hooks/use-toast';

export function useTaxSettings(shopId?: string) {
  const { toast } = useToast();
  
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    labor_tax_rate: 0.0,
    parts_tax_rate: 0.0,
    tax_calculation_method: 'separate',
    tax_display_method: 'exclusive',
    apply_tax_to_labor: true,
    apply_tax_to_parts: true,
    tax_description: 'Tax',
    tax_exempt_customers: []
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataChanged, setDataChanged] = useState(false);

  const loadTaxSettings = async () => {
    if (!shopId) return;
    
    try {
      setLoading(true);
      const settings = await taxSettingsService.getTaxSettings(shopId);
      setTaxSettings(settings);
      setDataChanged(false);
    } catch (error) {
      console.error('Failed to load tax settings:', error);
      toast({
        title: "Error",
        description: "Failed to load tax settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      loadTaxSettings();
    }
  }, [shopId]);

  const updateTaxSetting = (key: keyof TaxSettings, value: any) => {
    setTaxSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setDataChanged(true);
  };

  const saveTaxSettings = async (): Promise<boolean> => {
    if (!shopId) return false;
    
    try {
      setSaving(true);
      const updatedSettings = await taxSettingsService.updateTaxSettings(shopId, taxSettings);
      setTaxSettings(updatedSettings);
      setDataChanged(false);
      
      toast({
        title: "Success",
        description: "Tax settings saved successfully",
      });
      
      return true;
    } catch (error) {
      console.error('Failed to save tax settings:', error);
      toast({
        title: "Error",
        description: "Failed to save tax settings",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    taxSettings,
    loading,
    saving,
    dataChanged,
    updateTaxSetting,
    saveTaxSettings,
    loadTaxSettings
  };
}