import { unifiedSettingsService } from '@/services/unified/unifiedSettingsService';

export interface TaxSettings {
  labor_tax_rate: number;
  parts_tax_rate: number;
  tax_calculation_method: 'separate' | 'compound';
  tax_display_method: 'inclusive' | 'exclusive';
  apply_tax_to_labor: boolean;
  apply_tax_to_parts: boolean;
  tax_description: string;
  tax_exempt_customers: string[];
}

async function getTaxSettings(shopId: string): Promise<TaxSettings> {
  try {
    const defaultSettings: TaxSettings = {
      labor_tax_rate: 0.0,
      parts_tax_rate: 0.0,
      tax_calculation_method: 'separate',
      tax_display_method: 'exclusive',
      apply_tax_to_labor: true,
      apply_tax_to_parts: true,
      tax_description: 'Tax',
      tax_exempt_customers: []
    };

    return await unifiedSettingsService.getSetting(
      shopId,
      'company',
      'tax_settings',
      defaultSettings
    );
  } catch (error) {
    console.error('Failed to get tax settings:', error);
    throw error;
  }
}

async function updateTaxSettings(shopId: string, taxSettings: TaxSettings): Promise<TaxSettings> {
  try {
    await unifiedSettingsService.setSetting(
      shopId,
      'company',
      'tax_settings',
      taxSettings
    );

    return taxSettings;
  } catch (error) {
    console.error('Failed to update tax settings:', error);
    throw error;
  }
}

export const taxSettingsService = {
  getTaxSettings,
  updateTaxSettings
};