
import { supabase } from '@/lib/supabase';

export interface ShopData {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  business_type?: string;
  industry?: string;
  other_industry?: string;
  logo_url?: string;
  onboarding_completed?: boolean;
  setup_step?: number;
  onboarding_data?: Record<string, any>;
  latitude?: number;
  longitude?: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  tax_id: string;
  business_type: string;
  industry: string;
  other_industry?: string;
  logo_url: string;
}

export interface ShopDataValidation {
  isValid: boolean;
  missingFields: string[];
}

class ShopDataService {
  /**
   * Get shop data from database
   */
  async getShopData(): Promise<ShopData | null> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Get user's profile to find shop_id - handle both patterns
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) {
        throw new Error('No shop associated with user');
      }

      // Get shop data
      const { data: shop, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', profile.shop_id)
        .single();

      if (error) {
        throw error;
      }

      return shop as ShopData;
    } catch (error) {
      console.error('Error fetching shop data:', error);
      return null;
    }
  }

  /**
   * Get validated shop data
   */
  async getValidatedShopData(): Promise<{ data: ShopData | null; validation: ShopDataValidation }> {
    const data = await this.getShopData();
    const validation = data ? this.validateShopData(data) : { isValid: false, missingFields: ['all'] };
    
    return { data, validation };
  }

  /**
   * Validate shop data completeness
   */
  validateShopData(shopData: ShopData): ShopDataValidation {
    const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'state'];
    const missingFields = requiredFields.filter(field => {
      const value = shopData[field as keyof ShopData];
      return !value || value.toString().trim() === '';
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Get company info in standardized format
   */
  async getCompanyInfo(): Promise<CompanyInfo | null> {
    try {
      const shopData = await this.getShopData();
      if (!shopData) return null;

      return {
        name: shopData.name || '',
        address: shopData.address || '',
        city: shopData.city || '',
        state: shopData.state || '',
        zip: shopData.postal_code || '',
        phone: shopData.phone || '',
        email: shopData.email || '',
        tax_id: shopData.tax_id || '',
        business_type: shopData.business_type || '',
        industry: shopData.industry || '',
        other_industry: shopData.other_industry || '',
        logo_url: shopData.logo_url || ''
      };
    } catch (error) {
      console.error('Error getting company info:', error);
      return null;
    }
  }

  /**
   * Update company info
   */
  async updateCompanyInfo(updates: Partial<CompanyInfo>): Promise<boolean> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Get user's profile to find shop_id - handle both patterns
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) return false;

      // Map CompanyInfo properties to database columns
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.city !== undefined) updateData.city = updates.city;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.zip !== undefined) updateData.postal_code = updates.zip;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.tax_id !== undefined) updateData.tax_id = updates.tax_id;
      if (updates.business_type !== undefined) updateData.business_type = updates.business_type;
      if (updates.industry !== undefined) updateData.industry = updates.industry;
      if (updates.other_industry !== undefined) updateData.other_industry = updates.other_industry;
      if (updates.logo_url !== undefined) updateData.logo_url = updates.logo_url;

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', profile.shop_id);

      if (error) {
        console.error('Error updating shop:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating company info:', error);
      return false;
    }
  }
}

export const shopDataService = new ShopDataService();
