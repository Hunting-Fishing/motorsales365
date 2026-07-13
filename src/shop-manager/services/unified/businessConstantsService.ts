import { supabase } from '@/integrations/supabase/client';

export interface BusinessConstant {
  value: string;
  label: string;
  description?: string;
  sortOrder?: number;
}

export interface BusinessConstantsResponse {
  businessTypes: BusinessConstant[];
  industries: BusinessConstant[];
  paymentMethods: BusinessConstant[];
}

class BusinessConstantsService {
  /**
   * Fetch business constants using existing tables for now
   */
  async getBusinessConstants(): Promise<BusinessConstantsResponse> {
    try {
      // Fetch from existing tables for now
      const [businessTypesResult, industriesResult] = await Promise.all([
        supabase.from('business_types').select('*').order('label'),
        supabase.from('business_industries').select('*').order('label')
      ]);

      if (businessTypesResult.error) throw businessTypesResult.error;
      if (industriesResult.error) throw industriesResult.error;

      const businessTypes = businessTypesResult.data?.map(item => ({
        value: item.value,
        label: item.label
      })) || [];

      const industries = industriesResult.data?.map(item => ({
        value: item.value,
        label: item.label
      })) || [];

      // Default payment methods for now
      const paymentMethods = [
        { value: 'cash', label: 'Cash' },
        { value: 'check', label: 'Check' },
        { value: 'credit_card', label: 'Credit Card' },
        { value: 'debit_card', label: 'Debit Card' },
        { value: 'bank_transfer', label: 'Bank Transfer' }
      ];

      return {
        businessTypes,
        industries,
        paymentMethods
      };
    } catch (error) {
      console.error('Error fetching business constants:', error);
      throw new Error('Failed to load business constants');
    }
  }

  /**
   * Get constants for a specific category (simplified for existing tables)
   */
  async getConstantsByCategory(category: string): Promise<BusinessConstant[]> {
    try {
      if (category === 'business_types') {
        const { data, error } = await supabase
          .from('business_types')
          .select('*')
          .order('label');
        
        if (error) throw error;
        return data.map(item => ({ value: item.value, label: item.label }));
      }
      
      if (category === 'industries') {
        const { data, error } = await supabase
          .from('business_industries')
          .select('*')
          .order('label');
        
        if (error) throw error;
        return data.map(item => ({ value: item.value, label: item.label }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching ${category} constants:`, error);
      throw new Error(`Failed to load ${category} constants`);
    }
  }

  /**
   * Add a custom industry (using existing table)
   */
  async addCustomIndustry(industryName: string): Promise<string> {
    try {
      const key = industryName.toLowerCase().replace(/\s+/g, '_');
      
      const { data, error } = await supabase
        .from('business_industries')
        .insert({
          value: key,
          label: industryName
        })
        .select()
        .single();

      if (error) throw error;

      return data.value;
    } catch (error) {
      console.error('Error adding custom industry:', error);
      throw new Error('Failed to add custom industry');
    }
  }

  /**
   * Admin function to manage business constants using existing tables
   */
  async upsertConstant(
    category: string,
    key: string,
    label: string,
    value?: string,
    options?: {
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ): Promise<void> {
    try {
      if (category === 'business_types') {
        const { error } = await supabase
          .from('business_types')
          .upsert({ value: key, label }, { onConflict: 'value' });
        if (error) throw error;
      } else if (category === 'industries') {
        const { error } = await supabase
          .from('business_industries')
          .upsert({ value: key, label }, { onConflict: 'value' });
        if (error) throw error;
      } else {
        console.warn(`Category "${category}" not supported for upsert`);
      }
    } catch (error) {
      console.error('Error upserting constant:', error);
      throw new Error('Failed to upsert constant');
    }
  }
}

export const businessConstantsService = new BusinessConstantsService();